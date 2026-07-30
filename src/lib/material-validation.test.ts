import { describe, expect, it } from "vitest";
import {
  MAX_MATERIAL_FILE_SIZE,
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
});
