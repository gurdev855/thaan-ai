// ============================================================
// THAAN.AI BACKEND API — Express server
// ES Module
// ============================================================
// Provides:
//   GET  /
//   GET  /api/health
//   POST /api/detect
//   POST /api/sign
//   POST /api/verify
//   GET  /api/share/:shareId
//
// API keys stay server-side and are never exposed to the browser.
// ============================================================

import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import helmet from "helmet";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

dotenv.config();

const app = express();

// ============================================================
// SERVER CONFIG
// ============================================================

app.set("trust proxy", process.env.TRUST_PROXY === "true");

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : true;

app.use(cors({ origin: allowedOrigins }));
app.use(helmet());
app.use(express.json({ limit: "20mb" }));

// ============================================================
// CONFIG / STATE
// ============================================================

const cache = new Map();
const requestLog = new Map();

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;

const shareStore = new Map();

const SIGNING_SECRET =
  process.env.SIGNING_SECRET ||
  (process.env.NODE_ENV === "production"
    ? undefined
    : "local-development-signing-secret");

const hasAnthropicKey = Boolean(
  process.env.ANTHROPIC_API_KEY &&
    !process.env.ANTHROPIC_API_KEY.includes("your-key-here")
);

const hasGeminiKey = Boolean(
  process.env.GEMINI_API_KEY &&
    !process.env.GEMINI_API_KEY.includes("your-gemini-key")
);

// ============================================================
// HOME ROUTE
// ============================================================

app.get("/", (req, res) => {
  res.json({
    name: "Thaan.ai",
    status: "running",
    message: "Thaan.ai API is live 🚀",
    endpoints: {
      health: "/api/health",
      detect: "POST /api/detect",
      sign: "POST /api/sign",
      verify: "POST /api/verify",
      share: "GET /api/share/:shareId",
    },
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalize(value[key])}`
    )
    .join(",")}}`;
}

function signPayload(payload) {
  if (!SIGNING_SECRET) {
    throw new Error("SIGNING_SECRET is not configured");
  }

  return createHmac("sha256", SIGNING_SECRET)
    .update(canonicalize(payload))
    .digest("hex");
}

function signaturesMatch(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");

  return a.length === b.length && timingSafeEqual(a, b);
}

function requireSigningSecret(res) {
  if (!SIGNING_SECRET) {
    res.status(503).json({
      error: "Server signing is not configured",
    });

    return false;
  }

  return true;
}

function validateImageBase64(imageBase64) {
  if (
    typeof imageBase64 !== "string" ||
    imageBase64.length > 14_000_000
  ) {
    return false;
  }

  try {
    const bytes = Buffer.from(imageBase64, "base64");

    const isJpeg =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;

    const isPng =
      bytes.length >= 8 &&
      bytes
        .subarray(0, 8)
        .equals(
          Buffer.from([
            137,
            80,
            78,
            71,
            13,
            10,
            26,
            10,
          ])
        );

    const isWebp =
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP";

    return isJpeg || isPng || isWebp;
  } catch {
    return false;
  }
}

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
You are a fabric quality control AI.
Analyze the provided fabric image and detect defects.

You MUST respond with ONLY valid JSON.
No markdown.
No explanation.
No code fences.

Return this exact JSON structure:

{
  "fabric_type_guess": "string describing the fabric type",
  "material": "best visual estimate, such as 100% cotton or cotton/polyester blend",
  "color": "dominant color name",
  "weave_or_knit": "plain weave, twill, jersey knit, etc.",
  "finish": "visible finish or unknown if not inferable",
  "metadata_confidence": 0.0,
  "image_quality": "good" or "poor",
  "defects": [
    {
      "id": "d1",
      "type": "hole|stain|slub|thick_yarn|thin_place|broken_end|float|weft_bar|crease|other",
      "severity": "major|minor",
      "bbox": {
        "x": 0.0,
        "y": 0.0,
        "w": 0.0,
        "h": 0.0
      },
      "confidence": 0.0,
      "note": "brief description"
    }
  ]
}

Rules:

- bbox values are 0-1 fractions of image dimensions.
- x = left.
- y = top.
- w = width.
- h = height.

- severity "major" = clearly visible defect that will affect garment quality.
- severity "minor" = barely visible, unlikely to cause a reject.
- confidence is 0-1.
- List only real defects, not normal fabric texture or weave patterns.
- Infer material, color, construction, and finish conservatively.
- Use "Unknown" rather than inventing a specification.
- metadata_confidence is 0-1.
- If image quality is too poor to assess, return:
  image_quality: "poor"
  defects: []

Return ONLY valid JSON.
`;

// ============================================================
// POST /api/detect
// ============================================================

app.post("/api/detect", async (req, res) => {
  try {
    const { imageBase64, imageHash } = req.body;

    // --------------------------------------------------------
    // RATE LIMIT
    // --------------------------------------------------------

    const clientKey = req.ip || "unknown";
    const now = Date.now();

    const recentRequests = (
      requestLog.get(clientKey) || []
    ).filter(
      (time) => now - time < RATE_WINDOW_MS
    );

    if (recentRequests.length >= RATE_LIMIT) {
      return res.status(429).json({
        error:
          "Too many detection requests. Please wait a minute and try again.",
      });
    }

    recentRequests.push(now);
    requestLog.set(clientKey, recentRequests);

    // --------------------------------------------------------
    // VALIDATE IMAGE
    // --------------------------------------------------------

    if (!imageBase64) {
      return res.status(400).json({
        error: "imageBase64 is required",
      });
    }

    if (
      typeof imageBase64 !== "string" ||
      imageBase64.length > 14_000_000
    ) {
      return res.status(413).json({
        error: "Image payload is too large",
      });
    }

    if (!validateImageBase64(imageBase64)) {
      return res.status(400).json({
        error:
          "Unsupported or invalid image. Use a real JPEG, PNG, or WEBP file.",
      });
    }

    // --------------------------------------------------------
    // CACHE
    // --------------------------------------------------------

    if (imageHash && cache.has(imageHash)) {
      return res.json(cache.get(imageHash));
    }

    // --------------------------------------------------------
    // VISION MODEL
    // --------------------------------------------------------

    const visionModel =
      process.env.VISION_MODEL || "claude-opus-4-5";

    // --------------------------------------------------------
    // CLAUDE
    // --------------------------------------------------------

    if (hasAnthropicKey) {
      const result = await callClaude(
        imageBase64,
        visionModel
      );

      const response = {
        ...result,
        source: "ai",
      };

      if (imageHash) {
        cache.set(imageHash, response);
      }

      return res.json(response);
    }

    // --------------------------------------------------------
    // GEMINI
    // --------------------------------------------------------

    if (hasGeminiKey) {
      const result = await callGemini(imageBase64);

      const response = {
        ...result,
        source: "ai",
      };

      if (imageHash) {
        cache.set(imageHash, response);
      }

      return res.json(response);
    }

    // --------------------------------------------------------
    // FALLBACK
    // --------------------------------------------------------

    console.log(
      "No valid AI API key provided. Returning deterministic inspection."
    );

    const fallbackResult =
      generateDeterministicResult(
        imageHash || "default"
      );

    return res.json({
      ...fallbackResult,
      source: "fallback",
    });
  } catch (err) {
    console.error("Detection error:", err);

    return res.status(500).json({
      error:
        err.message || "Internal server error",
    });
  }
});

// ============================================================
// FALLBACK DETECTION
// ============================================================

function generateDeterministicResult(hash) {
  let seed = 0;

  for (let i = 0; i < hash.length; i++) {
    seed =
      (seed * 31 + hash.charCodeAt(i)) >>> 0;
  }

  const rand = (offset) => {
    const x =
      Math.sin(seed + offset) * 10000;

    return x - Math.floor(x);
  };

  const types = [
    "stain",
    "slub",
    "broken_end",
    "thick_yarn",
    "thin_place",
    "float",
  ];

  return {
    fabric_type_guess:
      "Cotton Blend Woven Fabric",

    material:
      "Cotton / polyester blend",

    color:
      "Neutral grey",

    weave_or_knit:
      "Plain weave",

    finish:
      "Unknown",

    metadata_confidence:
      0.78,

    image_quality:
      "good",

    defects: [
      {
        id: "d1",

        type:
          types[
            Math.floor(
              rand(1) * types.length
            )
          ],

        severity:
          rand(2) > 0.4
            ? "major"
            : "minor",

        bbox: {
          x:
            Math.round(
              (0.15 + rand(3) * 0.25) * 100
            ) / 100,

          y:
            Math.round(
              (0.20 + rand(4) * 0.30) * 100
            ) / 100,

          w:
            Math.round(
              (0.08 + rand(5) * 0.12) * 100
            ) / 100,

          h:
            Math.round(
              (0.06 + rand(6) * 0.10) * 100
            ) / 100,
        },

        confidence:
          Math.round(
            (0.85 + rand(7) * 0.12) * 100
          ) / 100,

        note:
          "Yarn irregularity in weave structure",
      },

      {
        id: "d2",

        type:
          types[
            Math.floor(
              rand(8) * types.length
            )
          ],

        severity:
          rand(9) > 0.5
            ? "major"
            : "minor",

        bbox: {
          x:
            Math.round(
              (0.52 + rand(10) * 0.25) * 100
            ) / 100,

          y:
            Math.round(
              (0.45 + rand(11) * 0.25) * 100
            ) / 100,

          w:
            Math.round(
              (0.06 + rand(12) * 0.10) * 100
            ) / 100,

          h:
            Math.round(
              (0.08 + rand(13) * 0.14) * 100
            ) / 100,
        },

        confidence:
          Math.round(
            (0.78 + rand(14) * 0.18) * 100
          ) / 100,

        note:
          "Slight pick density variation",
      },
    ],
  };
}

// ============================================================
// SIGN CERTIFICATE
// ============================================================

app.post("/api/sign", (req, res) => {
  if (!requireSigningSecret(res)) {
    return;
  }

  const { payload } = req.body || {};

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return res.status(400).json({
      error: "payload object is required",
    });
  }

  const fingerprint = signPayload(payload);
  const shareId = randomUUID();

  shareStore.set(shareId, {
    payload,
    fingerprint,
    createdAt: Date.now(),
  });

  return res.json({
    fingerprint,
    shareId,
  });
});

// ============================================================
// VERIFY CERTIFICATE
// ============================================================

app.post("/api/verify", (req, res) => {
  if (!requireSigningSecret(res)) {
    return;
  }

  const body = req.body || {};

  let payload = body.payload;
  let fingerprint = body.fingerprint;

  if (body.shareId) {
    const stored =
      shareStore.get(body.shareId);

    if (!stored) {
      return res.status(404).json({
        verified: false,
        error:
          "Share certificate was not found or has expired",
      });
    }

    payload = stored.payload;
    fingerprint =
      body.fingerprint ||
      stored.fingerprint;
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !fingerprint
  ) {
    return res.status(400).json({
      verified: false,
      error:
        "payload and fingerprint are required",
    });
  }

  return res.json({
    verified: signaturesMatch(
      signPayload(payload),
      fingerprint
    ),
  });
});

// ============================================================
// GET SHARE CERTIFICATE
// ============================================================

app.get(
  "/api/share/:shareId",
  (req, res) => {
    const stored =
      shareStore.get(req.params.shareId);

    if (!stored) {
      return res.status(404).json({
        error:
          "Share certificate was not found or has expired",
      });
    }

    return res.json({
      payload: stored.payload,
      fingerprint: stored.fingerprint,
      shareId: req.params.shareId,
    });
  }
);

// ============================================================
// CLAUDE VISION
// ============================================================

async function callClaude(
  imageBase64,
  model
) {
  const client = new Anthropic({
    apiKey:
      process.env.ANTHROPIC_API_KEY,
  });

  let mediaType = "image/jpeg";

  if (imageBase64.startsWith("/9j/")) {
    mediaType = "image/jpeg";
  } else if (
    imageBase64.startsWith("iVBORw0KGgo")
  ) {
    mediaType = "image/png";
  } else if (
    imageBase64.startsWith("UklGR")
  ) {
    mediaType = "image/webp";
  }

  const response =
    await client.messages.create({
      model,
      max_tokens: 2048,
      temperature: 0,
      system: SYSTEM_PROMPT,

      messages: [
        {
          role: "user",

          content: [
            {
              type: "image",

              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },

            {
              type: "text",

              text:
                "Analyze this fabric image for defects. Return ONLY valid JSON as specified.",
            },
          ],
        },
      ],
    });

  const rawText =
    response.content[0]?.text ?? "";

  return parseAndValidate(rawText);
}

// ============================================================
// GEMINI VISION
// ============================================================

async function callGemini(
  imageBase64
) {
  const {
    GoogleGenerativeAI,
  } = await import(
    "@google/generative-ai"
  );

  const genai =
    new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );

  const model =
    genai.getGenerativeModel({
      model:
        process.env.VISION_MODEL ||
        "gemini-1.5-pro",

      systemInstruction:
        SYSTEM_PROMPT,

      generationConfig: {
        temperature: 0,
        responseMimeType:
          "application/json",
      },
    });

  const result =
    await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg",
        },
      },

      "Analyze this fabric image for defects. Return ONLY valid JSON as specified.",
    ]);

  const rawText =
    result.response.text();

  return parseAndValidate(rawText);
}

// ============================================================
// PARSE / VALIDATE AI RESPONSE
// ============================================================

function parseAndValidate(rawText) {
  let text = rawText.trim();

  text = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    const match =
      text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error(
        "AI response was not valid JSON"
      );
    }

    parsed =
      JSON.parse(match[0]);
  }

  if (
    !parsed.defects ||
    !Array.isArray(parsed.defects)
  ) {
    parsed.defects = [];
  }

  parsed.defects =
    parsed.defects.map(
      (d, i) => ({
        id:
          d.id ||
          `d${i + 1}`,

        type:
          d.type ||
          "other",

        severity:
          d.severity ||
          "major",

        bbox: {
          x: clamp(
            d.bbox?.x ?? 0
          ),

          y: clamp(
            d.bbox?.y ?? 0
          ),

          w: clamp(
            d.bbox?.w ?? 0.1
          ),

          h: clamp(
            d.bbox?.h ?? 0.1
          ),
        },

        confidence:
          clamp(
            d.confidence ?? 0.8
          ),

        note:
          d.note || "",
      })
    );

  parsed.fabric_type_guess =
    parsed.fabric_type_guess ||
    "Unknown fabric";

  parsed.material =
    parsed.material ||
    "Unknown";

  parsed.color =
    parsed.color ||
    "Unknown";

  parsed.weave_or_knit =
    parsed.weave_or_knit ||
    "Unknown";

  parsed.finish =
    parsed.finish ||
    "Unknown";

  parsed.metadata_confidence =
    clamp(
      parsed.metadata_confidence ??
        0.5
    );

  parsed.image_quality =
    ["good", "poor"].includes(
      parsed.image_quality
    )
      ? parsed.image_quality
      : "good";

  return parsed;
}

// ============================================================
// CLAMP
// ============================================================

function clamp(
  v,
  min = 0,
  max = 1
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(v) || 0
    )
  );
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      ok: true,

      hasAnthropic:
        hasAnthropicKey,

      hasGemini:
        hasGeminiKey,

      model:
        process.env.VISION_MODEL ||
        "claude-opus-4-5",

      cacheSize:
        cache.size,
    });
  }
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (err, req, res, next) => {
    console.error(
      "Unhandled API error:",
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    return res.status(500).json({
      error:
        "Internal server error",
    });
  }
);

// ============================================================
// PORT
// ============================================================

const PORT =
  process.env.PORT || 3001;

// ============================================================
// EXPORTS
// ============================================================

export {
  app,
  canonicalize,
  signPayload,
  validateImageBase64,
};

// ============================================================
// START SERVER
// ============================================================

if (
  process.env.NODE_ENV !== "test"
) {
  if (
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.GEMINI_API_KEY
  ) {
    console.warn(
      "WARNING: No vision API key configured. Detection will use clearly-labeled fallback data."
    );
  }

  if (!process.env.SIGNING_SECRET) {
    console.warn(
      "WARNING: SIGNING_SECRET is not configured. Local development signing secret is active; set it before deployment."
    );
  }

  app.listen(
    PORT,
    () => {
      console.log(
        `\n🧵 Thaan.ai API server running on port ${PORT}`
      );

      console.log(
        `   Anthropic key: ${
          hasAnthropicKey
            ? "✓ set"
            : "✗ not set"
        }`
      );

      console.log(
        `   Gemini key: ${
          hasGeminiKey
            ? "✓ set"
            : "✗ not set"
        }`
      );

      console.log(
        `   Vision model: ${
          process.env.VISION_MODEL ||
          "claude-opus-4-5"
        }\n`
      );
    }
  );
}