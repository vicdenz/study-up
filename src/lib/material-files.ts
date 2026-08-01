import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import {
  validateMaterialFile,
} from "@/lib/material-validation";

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MAX_PDF_PAGES = 100;
const MAX_EXTRACTED_CHARACTERS = 200_000;

export const extractMaterialText = async (file: File): Promise<string | null> => {
  validateMaterialFile(file);

  if (file.type === "text/plain") {
    return (await file.text()).slice(0, MAX_EXTRACTED_CHARACTERS).trim() || null;
  }

  if (file.type !== "application/pdf") {
    return null;
  }

  const document = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise;

  if (document.numPages > MAX_PDF_PAGES) {
    throw new Error(`PDFs are limited to ${MAX_PDF_PAGES} pages.`);
  }

  let text = "";
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    text += `${pageText}\n\n`;
    if (text.length >= MAX_EXTRACTED_CHARACTERS) break;
  }

  return text.slice(0, MAX_EXTRACTED_CHARACTERS).trim() || null;
};
