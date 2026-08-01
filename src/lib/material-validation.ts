export const MAX_MATERIAL_FILE_SIZE = 20 * 1024 * 1024;

export const validateMaterialFile = (file: File) => {
  if (file.size === 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > MAX_MATERIAL_FILE_SIZE) {
    throw new Error("Files must be 20 MB or smaller.");
  }
};

export const safeStorageFileName = (fileName: string) => {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.slice(-120) || "material";
};

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";
