import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  handleError,
  HttpError,
  jsonResponse,
  parseJsonObject,
  requireUserClient,
} from "../_shared/http.ts";

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash";

interface StudyPlanSession {
  title: string;
  description: string;
  scheduled_date: string;
  duration: number;
}

interface StudyPlan {
  rationale: string;
  sessions: StudyPlanSession[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

const isStudyPlan = (value: unknown): value is StudyPlan => {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  if (typeof plan.rationale !== "string" || !Array.isArray(plan.sessions)) {
    return false;
  }
  if (plan.sessions.length === 0 || plan.sessions.length > 30) return false;

  return plan.sessions.every((session) => {
    if (!session || typeof session !== "object") return false;
    const candidate = session as Record<string, unknown>;
    return (
      typeof candidate.title === "string" &&
      candidate.title.length > 0 &&
      typeof candidate.description === "string" &&
      typeof candidate.scheduled_date === "string" &&
      !Number.isNaN(Date.parse(candidate.scheduled_date)) &&
      typeof candidate.duration === "number" &&
      Number.isInteger(candidate.duration) &&
      candidate.duration >= 30 &&
      candidate.duration <= 120
    );
  });
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  try {
    const { supabase } = await requireUserClient(request);
    const body = await parseJsonObject(request);
    const assignmentId = typeof body.assignmentId === "string"
      ? body.assignmentId.trim()
      : "";

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(assignmentId)
    ) {
      throw new HttpError(400, "A valid assignmentId is required");
    }

    // This user-scoped client enforces the assignment and material RLS policies.
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("title, description, due_date, course_id")
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      throw new HttpError(404, "Assignment not found");
    }
    if (!assignment.due_date) {
      throw new HttpError(400, "The assignment needs a due date");
    }

    const dueDate = new Date(assignment.due_date);
    if (dueDate.getTime() <= Date.now()) {
      throw new HttpError(400, "The assignment due date must be in the future");
    }

    const { data: materials, error: materialsError } = await supabase
      .from("assignment_materials")
      .select("title, content")
      .eq("assignment_id", assignmentId)
      .limit(5);

    if (materialsError) {
      throw new HttpError(500, "Could not load assignment materials");
    }

    const materialsContext = materials?.length
      ? materials
        .map((material) =>
          `Material: ${material.title}\nContent: ${
            material.content?.slice(0, 2_000) ?? "No text content available"
          }`
        )
        .join("\n\n")
      : "No materials provided.";

    const prompt =
      `You are an expert academic planner. Create a realistic study plan.

Assignment:
- Title: ${assignment.title}
- Description: ${assignment.description ?? "No description provided"}
- Due date: ${dueDate.toISOString()}
- Current date: ${new Date().toISOString()}

Materials:
${materialsContext}

Return only JSON with this shape:
{
  "rationale": "brief explanation",
  "sessions": [
    {
      "title": "session title",
      "description": "specific work",
      "scheduled_date": "ISO 8601 timestamp before the due date",
      "duration": 60
    }
  ]
}

Use 30–120 minute sessions, schedule all sessions before the due date, and return no more than 30 sessions.`;

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 4_096,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!geminiResponse.ok) {
      console.error("Gemini API error", geminiResponse.status);
      throw new HttpError(
        502,
        "The AI provider could not generate a study plan",
      );
    }

    const data = await geminiResponse.json() as GeminiResponse;
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new HttpError(422, "The AI provider returned an empty plan");
    }

    let plan: unknown;
    try {
      plan = JSON.parse(generatedText);
    } catch {
      throw new HttpError(502, "The AI provider returned invalid JSON");
    }

    if (!isStudyPlan(plan)) {
      throw new HttpError(
        502,
        "The AI provider returned an invalid study plan",
      );
    }
    if (
      plan.sessions.some((session) =>
        new Date(session.scheduled_date) >= dueDate
      )
    ) {
      throw new HttpError(
        502,
        "The AI provider scheduled a session after the due date",
      );
    }

    return jsonResponse(request, plan);
  } catch (error) {
    return handleError(request, error);
  }
});
