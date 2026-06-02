import { GITHUB_WEBHOOK_SECRET } from "../config/env";

export function getBackendUrl(): string {
  return process.env.BACKEND_URL || process.env.DASHBOARD_URL || "";
}

export function getWebhookSecret(): string {
  return GITHUB_WEBHOOK_SECRET;
}
