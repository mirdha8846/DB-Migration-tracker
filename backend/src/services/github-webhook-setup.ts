import { eventBus, TOPICS } from "./event-bus";

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
  const token = process.env.GITHUB_TOKEN;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!token) {
    return { success: false, error: "GITHUB_TOKEN not configured in backend .env" };
  }

  if (!secret) {
    return { success: false, error: "GITHUB_WEBHOOK_SECRET not configured in backend .env" };
  }

  if (!backendUrl) {
    return { success: false, error: "BACKEND_URL or DASHBOARD_URL not configured" };
  }

  try {
    // Check if webhook already exists
    const existingHooks = await fetch(
      `https://api.github.com/repos/${repoFullName}/hooks`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (existingHooks.ok) {
      const hooks: any = await existingHooks.json();
      const webhookUrl = `${backendUrl}/webhook/github`;
      const alreadyExists = (hooks as any[]).find(
        (h: any) => h.config?.url === webhookUrl && h.active,
      );
      if (alreadyExists) {
        console.log(`🔗 Webhook already exists for ${repoFullName}`);
        return { success: true, webhookId: alreadyExists.id, webhookUrl, alreadyExists: true };
      }
    }

    // Create webhook
    const webhookUrl = `${backendUrl}/webhook/github`;
    console.log(`🔗 Creating webhook for ${repoFullName} → ${webhookUrl}`);

    const res = await fetch(
      `https://api.github.com/repos/${repoFullName}/hooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          name: "web",
          active: true,
          events: ["pull_request"],
          config: {
            url: webhookUrl,
            content_type: "json",
            secret: secret,
            insecure_ssl: "0",
          },
        }),
      },
    );

    const data: any = await res.json();

    if (res.ok) {
      console.log(`✅ Webhook created for ${repoFullName} (id: ${data.id})`);
      return { success: true, webhookId: data.id, webhookUrl };
    }

    console.error(`❌ Webhook creation failed for ${repoFullName}:`, data.message);
    return {
      success: false,
      error: data.message || "GitHub API error",
    };
  } catch (err: any) {
    console.error(`❌ Webhook setup error:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function listWebhooks(repoFullName: string): Promise<any[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return [];

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoFullName}/hooks`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!res.ok) return [];
    return (await res.json()) as any[];
  } catch {
    return [];
  }
}

export async function deleteWebhook(
  repoFullName: string,
  webhookId: number,
): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoFullName}/hooks/${webhookId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
