interface NotifyPayload {
  migrationId: string;
  projectId: string;
  fileName: string;
  changes: Array<{ changeType: string; table: string; column?: string; risk: string }>;
  overallRisk: string;
  prNumber?: number;
  repoFullName?: string;
  affectedServices: Array<{ serviceName: string; filePath: string; issue: string; fix: string }>;
  deployOrder: string[];
  dashboardUrl: string;
}

function riskEmoji(risk: string): string {
  const map: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🟢",
  };
  return map[risk.toLowerCase()] || "⚪";
}

export async function notifyGitHub(payload: NotifyPayload): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  if (!token || !payload.prNumber || !payload.repoFullName) {
    console.log("📋 GitHub notification skipped (no token or PR info)");
    return false;
  }

  const body = `## 🛡️ SchemaGuard Impact Report

**Migration:** \`${payload.fileName}\`
**Overall Risk:** ${riskEmoji(payload.overallRisk)} ${payload.overallRisk.toUpperCase()}

### Changes Detected
| Change | Table | Column | Risk |
|--------|-------|--------|------|
${payload.changes.map((c) => `| ${c.changeType} | ${c.table} | ${c.column || "—"} | ${c.risk} |`).join("\n")}

### Affected Services (${payload.affectedServices.length})
${payload.affectedServices.map((s) => `**${s.serviceName}** — \`${s.filePath}\`
> ${s.issue}
> **Fix:** ${s.fix}`).join("\n\n")}

### Deploy Order
${payload.deployOrder.map((s, i) => `${i + 1}. ${s}`).join("\n")}

---
*Powered by SchemaGuard · [View full report](${payload.dashboardUrl})*`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${payload.repoFullName}/issues/${payload.prNumber}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      },
    );

    if (res.ok) {
      console.log("✅ GitHub PR comment posted");
      return true;
    }
    console.log("❌ GitHub notification failed:", await res.text());
    return false;
  } catch (err: any) {
    console.error("GitHub notify error:", err.message);
    return false;
  }
}

export async function notifySlack(payload: NotifyPayload): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("📋 Slack notification skipped (no webhook URL)");
    return false;
  }

  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${riskEmoji(payload.overallRisk)} SchemaGuard: ${payload.fileName}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Overall Risk:* ${payload.overallRisk.toUpperCase()}\n*Affected Services:* ${payload.affectedServices.length}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Report" },
            url: payload.dashboardUrl,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (res.ok) {
      console.log("✅ Slack notification sent");
      return true;
    }
    return false;
  } catch (err: any) {
    console.error("Slack notify error:", err.message);
    return false;
  }
}

export async function orchestrateNotifications(payload: NotifyPayload): Promise<{
  githubSent: boolean;
  slackSent: boolean;
}> {
  let githubSent = false;
  let slackSent = false;

  if (payload.prNumber && payload.repoFullName) {
    githubSent = await notifyGitHub(payload);
  }

  if (payload.overallRisk.toLowerCase() === "high" || payload.overallRisk.toLowerCase() === "critical") {
    slackSent = await notifySlack(payload);
  }

  return { githubSent, slackSent };
}
