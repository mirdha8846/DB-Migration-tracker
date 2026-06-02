import "dotenv/config";

const required = ["JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

export const JWT_SECRET = process.env.JWT_SECRET as string;
export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
