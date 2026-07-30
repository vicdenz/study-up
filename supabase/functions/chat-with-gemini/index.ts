import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  enforceAiQuota,
  handleError,
  HttpError,
  jsonResponse,
  parseJsonObject,
  requireUserClient,
} from "../_shared/http.ts";

const MAX_MESSAGE_LENGTH = 8_000;
const MAX_CONTEXT_LENGTH = 50_000;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash";

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
};

const readLimitedBody = async (response: Response) => {
  if (!response.body) throw new HttpError(400, "Image response was empty");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new HttpError(413, "Each image must be 5 MB or smaller");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const fetchSupabaseImage = async (rawUrl: string, supabaseUrl: string) => {
  let imageUrl: URL;
  const projectUrl = new URL(supabaseUrl);

  try {
    imageUrl = new URL(rawUrl);
  } catch {
    throw new HttpError(400, "Invalid image URL");
  }

  if (
    imageUrl.protocol !== "https:" ||
    imageUrl.hostname !== projectUrl.hostname ||
    !imageUrl.pathname.startsWith("/storage/v1/object/")
  ) {
    throw new HttpError(
      400,
      "Images must come from this project's Supabase Storage",
    );
  }

  const response = await fetch(imageUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  const contentType = response.headers.get("content-type")?.split(";")[0];

  if (!response.ok || !contentType?.startsWith("image/")) {
    throw new HttpError(400, "Could not load a valid image");
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new HttpError(413, "Each image must be 5 MB or smaller");
  }

  return {
    contentType,
    bytes: await readLimitedBody(response),
  };
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  try {
    const { supabase, supabaseUrl } = await requireUserClient(request);
    const body = await parseJsonObject(request);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim() : "";
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((url): url is string => typeof url === "string")
      : [];

    if (!message) throw new HttpError(400, "Message is required");
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new HttpError(
        400,
        `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
      );
    }
    if (context.length > MAX_CONTEXT_LENGTH) {
      throw new HttpError(
        400,
        `Context cannot exceed ${MAX_CONTEXT_LENGTH} characters`,
      );
    }
    if (imageUrls.length > MAX_IMAGES) {
      throw new HttpError(400, `A maximum of ${MAX_IMAGES} images is allowed`);
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");
    await enforceAiQuota(supabase, "chat-with-gemini");

    const parts: GeminiPart[] = [{
      text: context
        ? `Context:\n${context}\n\nUser question: ${message}`
        : message,
    }];

    for (const imageUrl of imageUrls) {
      const image = await fetchSupabaseImage(imageUrl, supabaseUrl);
      parts.push({
        inline_data: {
          mime_type: image.contentType,
          data: bytesToBase64(image.bytes),
        },
      });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: 2_048 },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!geminiResponse.ok) {
      console.error("Gemini API error", geminiResponse.status);
      throw new HttpError(502, "The AI provider could not generate a response");
    }

    const data = await geminiResponse.json() as GeminiResponse;
    const generatedText = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!generatedText) {
      const reason = data.promptFeedback?.blockReason ?? "safety policy";
      throw new HttpError(422, `No response was generated (${reason})`);
    }

    return jsonResponse(request, {
      response: generatedText,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    return handleError(request, error);
  }
});
