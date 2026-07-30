// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { downloadFile } from "./download-file";

const fetchMock = vi.fn();
const createObjectUrlMock = vi.fn();
const revokeObjectUrlMock = vi.fn();

describe("downloadFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(
        new Blob(["verified bytes"], { type: "text/plain" }),
      ),
    });
    createObjectUrlMock.mockReturnValue("blob:studyup-download");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("downloads signed cross-origin content through a same-origin blob URL", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    await downloadFile(
      "http://127.0.0.1:54321/storage/v1/object/sign/private/file",
      "lecture-notes.txt",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:54321/storage/v1/object/sign/private/file",
    );
    expect(createObjectUrlMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    const link = click.mock.instances[0] as HTMLAnchorElement;
    expect(link.href).toBe("blob:studyup-download");
    expect(link.download).toBe("lecture-notes.txt");
    expect(link.isConnected).toBe(false);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:studyup-download");
  });

  test("rejects an unsuccessful storage response before creating a file", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    await expect(downloadFile("https://storage.invalid/file", "file.txt"))
      .rejects.toThrow("Download failed with status 403");

    expect(createObjectUrlMock).not.toHaveBeenCalled();
    expect(revokeObjectUrlMock).not.toHaveBeenCalled();
  });

  test("releases the temporary URL even if the browser click fails", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("browser refused download");
    });

    await expect(downloadFile("https://storage.invalid/file", "file.txt"))
      .rejects.toThrow("browser refused download");

    expect(document.querySelector('a[download="file.txt"]')).toBeNull();
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:studyup-download");
  });
});
