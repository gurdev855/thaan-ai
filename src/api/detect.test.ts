import { describe, expect, it } from "vitest";
import { detectDefects } from "./detect";

describe("detection fallback", () => {
  it("labels intentional demo results as fallback data", async () => {
    const result = await detectDefects("aGVsbG8=", undefined, true);
    expect(result.fromDemo).toBe(true);
    expect(result.result.source).toBe("fallback");
    expect(result.result.defects.length).toBeGreaterThan(0);
  });
});