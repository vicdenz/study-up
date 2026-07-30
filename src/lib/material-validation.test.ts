import { describe, expect, it } from "vitest";
import {
  MAX_MATERIAL_FILE_SIZE,
  errorMessage,
  safeStorageFileName,
  validateMaterialFile,
} from "./material-validation";

describe("material file validation", () => {
  it("rejects empty files", () => {
    expect(() => validateMaterialFile(new File([], "empty.txt"))).toThrow(
      "empty",
    );
  });

  it("rejects files over 20 MB", () => {
    const oversized = new File(
      [new Uint8Array(MAX_MATERIAL_FILE_SIZE + 1)],
      "large.pdf",
    );
    expect(() => validateMaterialFile(oversized)).toThrow("20 MB");
  });

  it("accepts a non-empty file within the limit", () => {
    expect(() =>
      validateMaterialFile(new File(["notes"], "notes.txt")),
    ).not.toThrow();
  });

  it("accepts a file exactly at the size limit", () => {
    const maximumSize = new File(
      [new Uint8Array(MAX_MATERIAL_FILE_SIZE)],
      "maximum.pdf",
    );

    expect(() => validateMaterialFile(maximumSize)).not.toThrow();
  });
});

describe("safeStorageFileName", () => {
  it("removes path separators and unsafe characters", () => {
    expect(safeStorageFileName("../../Exam notes (final).pdf")).toBe(
      "..-..-Exam-notes-final-.pdf",
    );
  });

  it("provides a fallback name", () => {
    expect(safeStorageFileName("💥")).toBe("material");
  });

  it("normalizes Unicode and limits generated names to 120 characters", () => {
    const safeName = safeStorageFileName(`Résumé-${"a".repeat(150)}.pdf`);

    expect(safeName).toMatch(/^[a-zA-Z0-9._-]+$/);
    expect(safeName).toHaveLength(120);
    expect(safeName).toMatch(/\.pdf$/);
  });
});

describe("errorMessage", () => {
  it("returns the message from an Error", () => {
    expect(errorMessage(new Error("Upload failed"))).toBe("Upload failed");
  });

  it("does not expose arbitrary thrown values", () => {
    expect(errorMessage({ secret: "not-a-message" })).toBe("Unknown error");
  });
});
