import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.111.0";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const allowedOrigins = () =>
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const corsHeaders = (request: Request) => {
  const origin = request.headers.get("origin");
  const configuredOrigins = allowedOrigins();
  const allowedOrigin = origin &&
      (configuredOrigins.length === 0 || configuredOrigins.includes(origin))
    ? origin
    : configuredOrigins[0] ?? "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

export const jsonResponse = (
  request: Request,
  body: unknown,
  status = 200,
) =>
  Response.json(body, {
    status,
    headers: corsHeaders(request),
  });

export const requireUserClient = async (request: Request) => {
  const authorization = request.headers.get("authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");

  if (
    !authorization?.startsWith("Bearer ") || !supabaseUrl || !publishableKey
  ) {
    throw new HttpError(401, "Authentication required");
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, "Authentication required");
  }

  return { supabase, user, supabaseUrl };
};

export const enforceAiQuota = async (
  supabase: SupabaseClient,
  functionName: "chat-with-gemini" | "generate-study-plan",
) => {
  const { data, error } = await supabase
    .rpc("consume_ai_quota", { p_function_name: functionName })
    .single();
  const quota = data as {
    allowed?: boolean;
    remaining?: number;
    reset_at?: string;
  } | null;

  if (error || !quota || typeof quota.allowed !== "boolean") {
    console.error("Could not enforce AI quota", error);
    throw new HttpError(503, "AI usage limits are temporarily unavailable");
  }
  if (!quota.allowed) {
    throw new HttpError(
      429,
      `AI request limit reached. Try again after ${quota.reset_at ?? "the current usage window"}`,
    );
  }

  return quota;
};

export const parseJsonObject = async (request: Request) => {
  if (request.method !== "POST") {
    throw new HttpError(405, "Method not allowed");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 100_000) {
    throw new HttpError(413, "Request is too large");
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Expected an object");
    }
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid JSON request");
  }
};

export const handleError = (request: Request, error: unknown) => {
  if (error instanceof HttpError) {
    return jsonResponse(request, { error: error.message }, error.status);
  }

  console.error("Unhandled Edge Function error", error);
  return jsonResponse(request, { error: "An unexpected error occurred" }, 500);
};
