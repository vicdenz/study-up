import { createGeminiRequest } from "./gemini.ts";

const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
};

Deno.test("Gemini credentials are sent in a header, never the request URL", async () => {
  const request = createGeminiRequest("gemini/test", "secret-key", {
    contents: [],
  });

  assertEquals(request.url.includes("secret-key"), false);
  assertEquals(
    request.url,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini%2Ftest:generateContent",
  );
  assertEquals(request.headers.get("x-goog-api-key"), "secret-key");
  assertEquals(request.headers.get("content-type"), "application/json");
  assertEquals(await request.json(), { contents: [] });
});
