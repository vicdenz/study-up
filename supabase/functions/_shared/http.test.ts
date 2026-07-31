import type { SupabaseClient } from "npm:@supabase/supabase-js@2.111.0";
import {
  corsHeaders,
  enforceAiQuota,
  handleError,
  HttpError,
  jsonResponse,
  parseJsonObject,
} from "./http.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const assertEquals = (actual: unknown, expected: unknown) => {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  assert(
    actualJson === expectedJson,
    `Expected ${expectedJson}, received ${actualJson}`,
  );
};

const assertRejectsHttpError = async (
  operation: () => Promise<unknown>,
  status: number,
  message: string,
) => {
  try {
    await operation();
  } catch (error) {
    assert(error instanceof HttpError, "Expected an HttpError");
    assertEquals(error.status, status);
    assertEquals(error.message, message);
    return;
  }
  throw new Error("Expected the operation to reject");
};

const request = (
  body: BodyInit | null = null,
  init: Omit<RequestInit, "body"> = {},
) => new Request("https://studyup.example/functions/test", { ...init, body });

const quotaClient = (
  result: { data: unknown; error: unknown },
  onCall?: (name: string, arguments_: unknown) => void,
) =>
  ({
    rpc: (name: string, arguments_: unknown) => {
      onCall?.(name, arguments_);
      return { single: () => Promise.resolve(result) };
    },
  }) as unknown as SupabaseClient;

Deno.test("CORS reflects an explicitly allowed origin", () => {
  const previous = Deno.env.get("ALLOWED_ORIGINS");
  const previousPatterns = Deno.env.get("ALLOWED_ORIGIN_PATTERNS");
  try {
    Deno.env.set(
      "ALLOWED_ORIGINS",
      "https://preview.example,https://studyup.example",
    );
    Deno.env.delete("ALLOWED_ORIGIN_PATTERNS");

    const headers = corsHeaders(
      request(null, { headers: { origin: "https://studyup.example" } }),
    );

    assertEquals(
      headers["Access-Control-Allow-Origin"],
      "https://studyup.example",
    );
    assertEquals(headers.Vary, "Origin");
    assertEquals(headers["Access-Control-Max-Age"], "86400");
  } finally {
    if (previous === undefined) Deno.env.delete("ALLOWED_ORIGINS");
    else Deno.env.set("ALLOWED_ORIGINS", previous);
    if (previousPatterns === undefined) {
      Deno.env.delete("ALLOWED_ORIGIN_PATTERNS");
    } else {
      Deno.env.set("ALLOWED_ORIGIN_PATTERNS", previousPatterns);
    }
  }
});

Deno.test("CORS allows only project-scoped Vercel preview patterns", () => {
  const previous = Deno.env.get("ALLOWED_ORIGINS");
  const previousPatterns = Deno.env.get("ALLOWED_ORIGIN_PATTERNS");
  try {
    Deno.env.set("ALLOWED_ORIGINS", "https://studyup.example");
    Deno.env.set(
      "ALLOWED_ORIGIN_PATTERNS",
      "https://study-*-david-daniliucs-projects.vercel.app",
    );

    for (
      const origin of [
        "https://study-up-git-staging-david-daniliucs-projects.vercel.app",
        "https://study-abc123-david-daniliucs-projects.vercel.app",
      ]
    ) {
      const headers = corsHeaders(request(null, { headers: { origin } }));
      assertEquals(headers["Access-Control-Allow-Origin"], origin);
    }
  } finally {
    if (previous === undefined) Deno.env.delete("ALLOWED_ORIGINS");
    else Deno.env.set("ALLOWED_ORIGINS", previous);
    if (previousPatterns === undefined) {
      Deno.env.delete("ALLOWED_ORIGIN_PATTERNS");
    } else {
      Deno.env.set("ALLOWED_ORIGIN_PATTERNS", previousPatterns);
    }
  }
});

Deno.test("CORS does not reflect untrusted or pattern-confusion origins", () => {
  const previous = Deno.env.get("ALLOWED_ORIGINS");
  const previousPatterns = Deno.env.get("ALLOWED_ORIGIN_PATTERNS");
  try {
    Deno.env.set("ALLOWED_ORIGINS", "https://studyup.example");
    Deno.env.set(
      "ALLOWED_ORIGIN_PATTERNS",
      "https://study-*-david-daniliucs-projects.vercel.app",
    );

    for (
      const origin of [
        "https://attacker.example",
        "http://study-up-git-staging-david-daniliucs-projects.vercel.app",
        "https://study-up-git-staging-david-daniliucs-projects.vercel.app.attacker.example",
        "https://study-.vercel.app",
      ]
    ) {
      const headers = corsHeaders(request(null, { headers: { origin } }));
      assertEquals(headers["Access-Control-Allow-Origin"], "null");
    }
  } finally {
    if (previous === undefined) Deno.env.delete("ALLOWED_ORIGINS");
    else Deno.env.set("ALLOWED_ORIGINS", previous);
    if (previousPatterns === undefined) {
      Deno.env.delete("ALLOWED_ORIGIN_PATTERNS");
    } else {
      Deno.env.set("ALLOWED_ORIGIN_PATTERNS", previousPatterns);
    }
  }
});

Deno.test("CORS fails closed when no origins are configured or supplied", () => {
  const previous = Deno.env.get("ALLOWED_ORIGINS");
  const previousPatterns = Deno.env.get("ALLOWED_ORIGIN_PATTERNS");
  try {
    Deno.env.delete("ALLOWED_ORIGINS");
    Deno.env.delete("ALLOWED_ORIGIN_PATTERNS");

    for (
      const candidate of [
        request(),
        request(null, { headers: { origin: "https://unexpected.example" } }),
      ]
    ) {
      const headers = corsHeaders(candidate);
      assertEquals(headers["Access-Control-Allow-Origin"], "null");
    }
  } finally {
    if (previous !== undefined) Deno.env.set("ALLOWED_ORIGINS", previous);
    if (previousPatterns !== undefined) {
      Deno.env.set("ALLOWED_ORIGIN_PATTERNS", previousPatterns);
    }
  }
});

Deno.test("JSON responses include status, body, and CORS headers", async () => {
  const response = jsonResponse(request(), { ok: true }, 202);

  assertEquals(response.status, 202);
  assertEquals(await response.json(), { ok: true });
  assertEquals(response.headers.get("vary"), "Origin");
});

Deno.test("JSON parsing rejects methods other than POST", async () => {
  await assertRejectsHttpError(
    () => parseJsonObject(request(null, { method: "GET" })),
    405,
    "Method not allowed",
  );
});

Deno.test("JSON parsing rejects a declared oversized request", async () => {
  await assertRejectsHttpError(
    () =>
      parseJsonObject(
        request("{}", {
          method: "POST",
          headers: { "content-length": "100001" },
        }),
      ),
    413,
    "Request is too large",
  );
});

Deno.test("JSON parsing rejects malformed JSON", async () => {
  await assertRejectsHttpError(
    () => parseJsonObject(request("{", { method: "POST" })),
    400,
    "Invalid JSON request",
  );
});

Deno.test("JSON parsing rejects arrays and primitives", async () => {
  for (const body of ["[]", "null", '"text"', "1"]) {
    await assertRejectsHttpError(
      () => parseJsonObject(request(body, { method: "POST" })),
      400,
      "Invalid JSON request",
    );
  }
});

Deno.test("JSON parsing accepts an object body", async () => {
  const body = await parseJsonObject(
    request('{"message":"hello"}', { method: "POST" }),
  );

  assertEquals(body, { message: "hello" });
});

Deno.test("known HTTP errors preserve their safe status and message", async () => {
  const response = handleError(
    request(),
    new HttpError(429, "Request limit reached"),
  );

  assertEquals(response.status, 429);
  assertEquals(await response.json(), { error: "Request limit reached" });
});

Deno.test("unexpected errors are hidden from clients", async () => {
  const originalConsoleError = console.error;
  const logged: unknown[][] = [];
  console.error = (...arguments_: unknown[]) => logged.push(arguments_);
  try {
    const response = handleError(request(), new Error("database password"));

    assertEquals(response.status, 500);
    assertEquals(await response.json(), {
      error: "An unexpected error occurred",
    });
    assertEquals(logged.length, 1);
  } finally {
    console.error = originalConsoleError;
  }
});

Deno.test("AI quota calls the expected RPC and returns remaining capacity", async () => {
  let rpcCall: [string, unknown] | undefined;
  const client = quotaClient(
    {
      data: {
        allowed: true,
        remaining: 29,
        reset_at: "2026-07-30T05:00:00Z",
      },
      error: null,
    },
    (name, arguments_) => {
      rpcCall = [name, arguments_];
    },
  );

  const quota = await enforceAiQuota(client, "chat-with-gemini");

  assertEquals(rpcCall, [
    "consume_ai_quota",
    { p_function_name: "chat-with-gemini" },
  ]);
  assertEquals(quota.remaining, 29);
});

Deno.test("AI quota rejects an exhausted usage window", async () => {
  const client = quotaClient({
    data: {
      allowed: false,
      remaining: 0,
      reset_at: "2026-07-30T05:00:00Z",
    },
    error: null,
  });

  await assertRejectsHttpError(
    () => enforceAiQuota(client, "generate-study-plan"),
    429,
    "AI request limit reached. Try again after 2026-07-30T05:00:00Z",
  );
});

Deno.test("AI quota fails closed when the RPC errors", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const client = quotaClient({
      data: null,
      error: new Error("database unavailable"),
    });

    await assertRejectsHttpError(
      () => enforceAiQuota(client, "chat-with-gemini"),
      503,
      "AI usage limits are temporarily unavailable",
    );
  } finally {
    console.error = originalConsoleError;
  }
});

Deno.test("AI quota fails closed for a malformed RPC response", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const client = quotaClient({
      data: { remaining: 10 },
      error: null,
    });

    await assertRejectsHttpError(
      () => enforceAiQuota(client, "chat-with-gemini"),
      503,
      "AI usage limits are temporarily unavailable",
    );
  } finally {
    console.error = originalConsoleError;
  }
});
