import "dotenv/config";
import crypto from "crypto";

const required = ["JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

// Generate a unique webhook secret for this SchemaGuard instance if not provided
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || `sg-wh-${crypto.randomBytes(24).toString("hex")}`;

export const JWT_SECRET = process.env.JWT_SECRET as string;
export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
export const GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

