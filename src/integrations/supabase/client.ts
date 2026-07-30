import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const getRequiredEnv = (
  name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY",
) => {
  const value = import.meta.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and configure the Supabase project.`,
    );
  }

  return value;
};

export const supabase = createClient<Database>(
  getRequiredEnv("VITE_SUPABASE_URL"),
  getRequiredEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
