import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, canonicalize, validateImageBase64 } from "../server.js";

describe("certificate signing API", () => {
  const payload = { rollId: "ROLL-TEST", grading: { grade: "A", points: 0 }, source: "ai" };

  it("canonicalizes object keys deterministically", () => {
    expect(canonicalize({ b: 2, a: 1 })).toBe(canonicalize({ a: 1, b: 2 }));
  });

  it("signs and verifies an unchanged payload", async () => {
    const signed = await request(app).post("/api/sign").send({ payload }).expect(200);
    await request(app)
      .post("/api/verify")
      .send({ payload, fingerprint: signed.body.fingerprint })
      .expect(200)
      .expect(({ body }) => expect(body.verified).toBe(true));
  });

  it("rejects a changed payload", async () => {
    const signed = await request(app).post("/api/sign").send({ payload }).expect(200);
    await request(app)
      .post("/api/verify")
      .send({ payload: { ...payload, rollId: "ROLL-TAMPERED" }, fingerprint: signed.body.fingerprint })
      .expect(200)
      .expect(({ body }) => expect(body.verified).toBe(false));
  });

  it("accepts compact share verification", async () => {
    const signed = await request(app).post("/api/sign").send({ payload }).expect(200);
    const shared = await request(app).get(`/api/share/${signed.body.shareId}`).expect(200);
    expect(shared.body.payload).toEqual(payload);
    await request(app).post("/api/verify").send({ shareId: signed.body.shareId }).expect(200).expect(({ body }) => expect(body.verified).toBe(true));
  });
});

describe("image validation", () => {
  it("recognizes JPEG, PNG, and WEBP magic bytes", () => {
    expect(validateImageBase64("/9j/AA==")).toBe(true);
    expect(validateImageBase64("iVBORw0KGgoAAA==")).toBe(true);
    expect(validateImageBase64("UklGRgAAAABXRUJQ")).toBe(true);
    expect(validateImageBase64("aGVsbG8=")).toBe(false);
  });
});