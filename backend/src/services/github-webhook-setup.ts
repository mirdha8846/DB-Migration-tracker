import { GITHUB_TOKEN, GITHUB_WEBHOOK_SECRET } from "../config/env";

export function getBackendUrl(): string {
  return process.env.BACKEND_URL || process.env.DASHBOARD_URL || "";
}

export function getWebhookSecret(): string {
  return GITHUB_WEBHOOK_SECRET;
}

interface WebhookResult {
  success: boolean;
  webhookId?: number;
  webhookUrl?: string;
  error?: string;
  alreadyExists?: boolean;
}

export async function setupGitHubWebhook(
  repoFullName: string,
  backendUrl: string,
): Promise<WebhookResult> {
  const token = GITHUB_TOKEN;
  const secret = GITHUB_WEBHOOK_SECRET;

  if (!token) return { success: false, error: "GITHUB_TOKEN not set — cannot auto-create webhook" };
  if (!backendUrl) return { success: false, error: "BACKEND_URL not set in backend .env" };

  try {
    const existingHooks = await fetch(`https://api.github.com/repos/${repoFullName}/hooks`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });

    if (existingHooks.ok) {
      const hooks: any = await existingHooks.json();
      const webhookUrl = `${backendUrl}/webhook/github`;
      const alreadyExists = (hooks as any[]).find((h: any) => h.config?.url === webhookUrl && h.active);
      if (alreadyExists) {
        console.log(`🔗 Webhook already exists for ${repoFullName}`);
        return { success: true, webhookId: alreadyExists.id, webhookUrl, alreadyExists: true };
      }
    }

    const webhookUrl = `${backendUrl}/webhook/github`;
    console.log(`🔗 Creating webhook for ${repoFullName} → ${webhookUrl}`);

    const res = await fetch(`https://api.github.com/repos/${repoFullName}/hooks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({
        name: "web", active: true, events: ["pull_request"],
        config: { url: webhookUrl, content_type: "json", secret, insecure_ssl: "0" },
      }),
    });

    const data: any = await res.json();
    if (res.ok) {
      console.log(`✅ Webhook created for ${repoFullName} (id: ${data.id})`);
      return { success: true, webhookId: data.id, webhookUrl };
    }
    return { success: false, error: data.message || "GitHub API error" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listWebhooks(repoFullName: string): Promise<any[]> {
  if (!GITHUB_TOKEN) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}/hooks`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!res.ok) return [];
    return (await res.json()) as any[];
  } catch { return []; }
}

export async function checkWebhookStatus(repoFullName: string): Promise<{
  exists: boolean; active: boolean; webhookUrl?: string; lastResponse?: number; error?: string;
}> {
  const token = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) return { exists: false, active: false, error: "GITHUB_TOKEN not set" };

  try {
    const hooks = await listWebhooks(repoFullName);
    const backendUrl = getBackendUrl();
    const ourHook = hooks.find((h: any) => h.config?.url?.includes("/webhook/github"));

    if (!ourHook) {
      return { exists: false, active: false, error: "No SchemaGuard webhook found on this repo" };
    }
    return {
      exists: true, active: ourHook.active,
      webhookUrl: ourHook.config?.url,
      lastResponse: ourHook.last_response?.code,
    };
  } catch (err: any) {
    return { exists: false, active: false, error: err.message };
  }
}
