import { describe, expect, it } from "vitest";
import { imageExtension, validateAdminImage } from "@/lib/admin-upload";

describe("admin image upload", () => {
  it("accepts supported images within the limit", () => {
    expect(validateAdminImage({ type: "image/webp", size: 1024 })).toBeNull();
  });

  it("rejects unsupported files and oversized images", () => {
    expect(validateAdminImage({ type: "image/svg+xml", size: 1024 })).toMatch(/JPG/);
    expect(validateAdminImage({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });

  it("maps safe extensions", () => {
    expect(imageExtension("image/png")).toBe("png");
    expect(imageExtension("image/jpeg")).toBe("jpg");
  });
});
