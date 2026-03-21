import fs from "node:fs";
import path from "node:path";

type EnvConfig = {
  port: number;
  logLevel: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  supabasePassengersTable: string;
  supabaseFlightsTable: string;
  useSupabase: boolean;
};

function parseEnvFile(content: string) {
  const result: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) result[key] = value;
  }

  return result;
}

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const parsed = parseEnvFile(fs.readFileSync(envPath, "utf8"));

  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

export function getEnvConfig(): EnvConfig {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || undefined;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || undefined;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;

  return {
    port: Number(process.env.PORT || 3001),
    logLevel: process.env.LOG_LEVEL || "info",
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    supabasePassengersTable: process.env.SUPABASE_PASSENGERS_TABLE?.trim() || "passengers",
    supabaseFlightsTable: process.env.SUPABASE_FLIGHTS_TABLE?.trim() || "flights",
    useSupabase: Boolean(supabaseUrl && supabaseAnonKey),
  };
}
