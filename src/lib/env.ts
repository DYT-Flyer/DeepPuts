import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is missing"),
  POLYGON_API_KEY: z.string().min(1, "POLYGON_API_KEY is missing").optional(),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is missing").optional(),
  // Add other required/optional keys here
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of _env.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  // Instead of logging the actual values which could leak secrets, just log the keys
  process.exit(1);
}

export const env = _env.data;
