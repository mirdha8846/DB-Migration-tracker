const DEEPSEEK_BASE = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

function getApiKey(): string {
  return process.env.DEEPSEEK_API_KEY || "";
}

export async function callDeepseek(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("⚠️ DEEPSEEK_API_KEY not set — using mock response");
    return mockResponse(userMessage);
  }

  const res = await fetch(DEEPSEEK_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  const data: any = await res.json();
  if (!res.ok) throw new Error(`Deepseek API error: ${JSON.stringify(data)}`);
  return data.choices?.[0]?.message?.content || "";
}

function mockResponse(userMessage: string): string {
  return JSON.stringify({
    summary: `Analysis of: "${userMessage.substring(0, 80)}..."`,
    technicalExplanation: `Set DEEPSEEK_API_KEY in .env to enable AI analysis.`,
    results: [],
    deployOrder: ["Run migration on staging", "Verify affected services", "Deploy to production"],
    affectedServiceFixes: [],
    estimatedRisk: "medium",
  });
}

const IMPACT_ANALYST_SYSTEM = `You are a database impact analyst. You analyze code snippets to determine
if they reference a specific database table or column.
Be conservative — if there is any reasonable chance the code uses the column,
mark it as affected. Respond ONLY with valid JSON.`;

export async function analyzeCodeSnippets(
  snippets: Array<{ snippetId: string; code: string; language: string }>,
  tableName: string,
  columnName: string,
  changeType: string,
): Promise<Array<{ snippetId: string; isAffected: boolean; confidence: number; reasoning: string }>> {
  const prompt = `A database migration will ${changeType} the column '${tableName}.${columnName}'.

Analyze each code snippet and determine if it uses this column.

Snippets to analyze:
${JSON.stringify(snippets, null, 2)}

Respond with this exact JSON structure:
{
  "results": [
    {
      "snippetId": "string",
      "isAffected": boolean,
      "confidence": 0.0-1.0,
      "reasoning": "one sentence explanation"
    }
  ]
}`;

  try {
    const response = await callDeepseek(IMPACT_ANALYST_SYSTEM, prompt, 1500);
    const parsed = JSON.parse(response);
    return parsed.results || [];
  } catch (err) {
    console.error("Agent 1 error:", err);
    return snippets.map((s) => ({
      snippetId: s.snippetId,
      isAffected: true,
      confidence: 0.5,
      reasoning: "Could not analyze — defaulting to affected (conservative)",
    }));
  }
}

const RISK_EXPLAINER_SYSTEM = `You are a senior database engineer helping engineering teams understand
the impact of database schema changes. You provide clear, actionable guidance.
Be specific — reference exact file names and line numbers from the context provided.
Respond ONLY with valid JSON.`;

export interface RiskExplanation {
  summary: string;
  technicalExplanation: string;
  affectedServiceFixes: Array<{
    serviceName: string;
    issue: string;
    fix: string;
    urgency: "before_migration" | "after_migration" | "optional";
  }>;
  deployOrder: string[];
  estimatedRisk: "low" | "medium" | "high" | "critical";
}

export async function generateRiskExplanation(
  migrationFilePath: string,
  changes: Array<{ changeType: string; tableName: string; columnName?: string; riskLevel: string }>,
  affectedServices: Array<{ serviceName: string; filePaths: string[] }>,
): Promise<RiskExplanation> {
  const prompt = `A migration is being applied to the database.

MIGRATION FILE: ${migrationFilePath}
CHANGES DETECTED:
${JSON.stringify(changes, null, 2)}

AFFECTED SERVICES AND FILES:
${JSON.stringify(affectedServices, null, 2)}

Generate a response with:
1. A clear explanation of what will break and WHY
2. Exact fix steps for each affected service
3. Recommended deploy order to safely roll this out

Respond with this exact JSON:
{
  "summary": "2-3 sentence non-technical summary",
  "technicalExplanation": "detailed explanation for engineers",
  "affectedServiceFixes": [
    {
      "serviceName": "string",
      "issue": "what exactly will break",
      "fix": "exact code change needed",
      "urgency": "before_migration|after_migration|optional"
    }
  ],
  "deployOrder": ["step 1", "step 2", "step 3"],
  "estimatedRisk": "low|medium|high|critical"
}`;

  try {
    const response = await callDeepseek(RISK_EXPLAINER_SYSTEM, prompt, 2000);
    return JSON.parse(response);
  } catch {
    return {
      summary: "AI analysis unavailable — DEEPSEEK_API_KEY not configured",
      technicalExplanation: "Set DEEPSEEK_API_KEY in .env to enable AI-powered risk analysis.",
      affectedServiceFixes: affectedServices.map((s) => ({
        serviceName: s.serviceName,
        issue: "Potential schema compatibility issue",
        fix: "Review and update schema references",
        urgency: "after_migration" as const,
      })),
      deployOrder: ["Run migration on staging", "Verify affected services", "Deploy to production"],
      estimatedRisk: "medium",
    };
  }
}

const ADVISOR_SYSTEM = `You are SchemaGuard's Migration Advisor — an expert database engineer
embedded in the developer's workflow. You help teams safely migrate database schemas.

Rules:
- Always recommend a phased rollout for changes affecting multiple services
- Reference specific patterns: shadow column + dual write + backfill + cleanup
- If you are uncertain, say so — never hallucinate file paths
- Be concise, actionable, and specific`;

export async function advisorChat(
  userMessage: string,
  projectContext?: string,
): Promise<{ reply: string; sourcesReferenced: string[] }> {
  const contextText = projectContext
    ? `\n\nCurrent project context:\n${projectContext}`
    : "";

  const prompt = `${userMessage}${contextText}`;

  try {
    const reply = await callDeepseek(ADVISOR_SYSTEM, prompt, 1500);
    // If reply is JSON (mock mode), parse it for readable text
    if (reply.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(reply);
        return {
          reply: parsed.summary || parsed.technicalExplanation || reply,
          sourcesReferenced: [],
        };
      } catch {}
    }
    return { reply, sourcesReferenced: [] };
  } catch {
    return {
      reply: `I could not reach the AI service. Please check your DEEPSEEK_API_KEY configuration.\n\nYour question was: "${userMessage}"\n\nFor now, I recommend: shadow-column + dual-write + phased backfill with canary deploy. This is the safest pattern for zero-downtime migrations.`,
      sourcesReferenced: ["schema-policy-4.2.1", "migration-playbook-v2"],
    };
  }
}
