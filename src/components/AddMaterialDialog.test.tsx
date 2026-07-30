// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import AddMaterialDialog from "./AddMaterialDialog";

const file = () =>
  new File(["verified material"], "lecture-notes.txt", {
    type: "text/plain",
  });

const openDialog = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Add Material" }));
};

describe("AddMaterialDialog", () => {
  test("requires a selected file and non-empty title", async () => {
    render(<AddMaterialDialog onAddMaterial={vi.fn()} isUploading={false} />);
    await openDialog();

    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
    await userEvent.upload(screen.getByLabelText("Select File"), file());
    expect(screen.getByLabelText("Title")).toHaveValue("lecture-notes.txt");
    expect(screen.getByRole("button", { name: "Upload" })).toBeEnabled();
  });

  test("submits file bytes and normalized metadata", async () => {
    const onAddMaterial = vi.fn().mockResolvedValue({ id: "material-1" });
    render(
      <AddMaterialDialog onAddMaterial={onAddMaterial} isUploading={false} />,
    );
    await openDialog();

    const uploadedFile = file();
    await userEvent.upload(screen.getByLabelText("Select File"), uploadedFile);
    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.type(screen.getByLabelText("Title"), "  Lecture One  ");
    fireEvent.submit(screen.getByRole("button", { name: "Upload" }).closest("form")!);

    await waitFor(() =>
      expect(onAddMaterial).toHaveBeenCalledWith({
        title: "Lecture One",
        type: "text/plain",
        file: uploadedFile,
      }),
    );
    expect(
      screen.queryByRole("heading", { name: "Upload Course Material" }),
    ).not.toBeInTheDocument();
  });

  test("retains the selected material after an upload failure", async () => {
    const onAddMaterial = vi.fn().mockRejectedValue(new Error("storage failed"));
    render(
      <AddMaterialDialog onAddMaterial={onAddMaterial} isUploading={false} />,
    );
    await openDialog();
    await userEvent.upload(screen.getByLabelText("Select File"), file());
    fireEvent.submit(screen.getByRole("button", { name: "Upload" }).closest("form")!);

    await waitFor(() => expect(onAddMaterial).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Title")).toHaveValue("lecture-notes.txt");
    expect(
      screen.getByRole("heading", { name: "Upload Course Material" }),
    ).toBeVisible();
  });

  test("disables submission while an upload is pending", async () => {
    render(<AddMaterialDialog onAddMaterial={vi.fn()} isUploading />);
    await openDialog();
    await userEvent.upload(screen.getByLabelText("Select File"), file());

    expect(screen.getByRole("button", { name: "Uploading..." })).toBeDisabled();
  });
});
