# ════════════════════════════════════════════════════════════════
#  SERVICE: ai-agent-service
#  ROLE: Three AI agents using Anthropic Claude API.
#        Agent 1: Impact Analyst (catch dynamic usage)
#        Agent 2: Risk Explainer (explain + fix steps)
#        Agent 3: Migration Advisor (chat interface)
# ════════════════════════════════════════════════════════════════

# ── CURSOR PROMPT ───────────────────────────────────────────────
"""
Create a Spring Boot 3.3 AI Agent service using Anthropic Claude API:

PACKAGE STRUCTURE:
com.schemaguard.aiagent
├── AiAgentApplication.java
├── config/
│   ├── AnthropicConfig.java        # RestTemplate/WebClient for Anthropic API
│   └── KafkaConfig.java
├── kafka/
│   ├── ScanCompleteConsumer.java   # Consume scan.complete → trigger Agent 1 & 2
│   └── AiAnalysisProducer.java     # Publish ai.analysis.complete
├── controller/
│   └── AdvisorController.java      # POST /advisor/chat  (Agent 3 endpoint)
├── agent/
│   ├── ImpactAnalystAgent.java     # Agent 1
│   ├── RiskExplainerAgent.java     # Agent 2
│   └── MigrationAdvisorAgent.java  # Agent 3
├── service/
│   ├── AnthropicApiService.java    # Raw API calls to Anthropic
│   ├── ContextBuilderService.java  # Build prompts with DB context
│   └── ConversationService.java    # Manage Agent 3 chat history in Redis
└── model/
    └── dto/
        ├── AnthropicRequest.java
        ├── AnthropicResponse.java
        ├── AgentAnalysisResult.java
        └── ChatMessage.java

ANTHROPIC API SETUP:
Base URL: https://api.anthropic.com/v1/messages
Headers:
  - x-api-key: ${ANTHROPIC_API_KEY}
  - anthropic-version: 2023-06-01
  - content-type: application/json
Model: claude-sonnet-4-20250514
Max tokens: 2000

AnthropicApiService.java — implement this method:
  public String callClaude(String systemPrompt, String userMessage) {
      // POST to /v1/messages
      // Body: { model, max_tokens, system: systemPrompt, messages: [{role:user, content:userMessage}] }
      // Return: response.content[0].text
  }

═══════════════════════════════════════════
AGENT 1: ImpactAnalystAgent
═══════════════════════════════════════════
Triggered by: scan.complete Kafka event
Purpose: Review code snippets flagged as potentially dynamic.
         Re-analyse them and determine if they truly use the affected column.

Method: analyzeCodeSnippets(List<UsageMatch> matches, SchemaChange change)

SYSTEM PROMPT (use exactly):
"You are a database impact analyst. You analyze code snippets to determine
if they reference a specific database table or column.
Be conservative — if there is any reasonable chance the code uses the column,
mark it as affected. Respond ONLY with valid JSON."

USER PROMPT template:
"A database migration will {changeType} the column '{tableName}.{columnName}'.

Analyze each code snippet and determine if it uses this column.

Snippets to analyze:
{snippetsJson}

Respond with this exact JSON structure:
{
  \"results\": [
    {
      \"snippetId\": \"string\",
      \"isAffected\": boolean,
      \"confidence\": 0.0-1.0,
      \"reasoning\": \"one sentence explanation\"
    }
  ]
}"

Parse JSON response. Update dependency_graph: set is_dynamic=true, confidence=AI score
for entries where isAffected=true.

═══════════════════════════════════════════
AGENT 2: RiskExplainerAgent
═══════════════════════════════════════════
Triggered by: After Agent 1 completes
Purpose: Generate human-readable explanation + exact fix steps per service.

Method: generateExplanation(Migration migration, List<SchemaChange> changes,
                             List<AffectedService> affectedServices)

SYSTEM PROMPT:
"You are a senior database engineer helping engineering teams understand
the impact of database schema changes. You provide clear, actionable guidance.
Be specific — reference exact file names and line numbers from the context provided.
Respond ONLY with valid JSON."

USER PROMPT template:
"A migration is being applied to the database.

MIGRATION FILE: {fileName}
CHANGES DETECTED:
{changesJson}

AFFECTED SERVICES AND FILES:
{affectedServicesJson}

Generate a response with:
1. A clear explanation of what will break and WHY
2. Exact fix steps for each affected service
3. Recommended deploy order to safely roll this out

Respond with this exact JSON:
{
  \"summary\": \"2-3 sentence non-technical summary\",
  \"technicalExplanation\": \"detailed explanation for engineers\",
  \"affectedServiceFixes\": [
    {
      \"serviceName\": \"string\",
      \"filePath\": \"string\",
      \"issue\": \"what exactly will break\",
      \"fix\": \"exact code change needed\",
      \"urgency\": \"before_migration|after_migration|optional\"
    }
  ],
  \"deployOrder\": [\"step 1\", \"step 2\", \"step 3\"],
  \"estimatedRisk\": \"low|medium|high|critical\"
}"

Save ai_explanation and ai_fix_steps to impact_reports table.

═══════════════════════════════════════════
AGENT 3: MigrationAdvisorAgent (Chat)
═══════════════════════════════════════════
Triggered by: POST /advisor/chat from dashboard
Purpose: Conversational interface for developers to ask questions.

ConversationService:
- Store chat history in Redis with key: advisor:chat:{sessionId}
- Expire after 4 hours
- Max 20 messages in history (sliding window)

SYSTEM PROMPT:
"You are SchemaGuard's Migration Advisor — an expert database engineer
embedded in the developer's workflow. You have access to the project's
schema, dependency graph, and incident history.

Current project context:
{projectContextJson}

Recent incidents involving this schema:
{recentIncidentsJson}

Rules:
- Always check the dependency graph before recommending a migration
- If a change affects 3+ services, always recommend a phased rollout
- Reference specific file paths and line numbers from the context
- If you are uncertain, say so — never hallucinate file paths"

Chat endpoint:
POST /advisor/chat
Body: { sessionId, projectId, message }
Response: { reply, sourcesReferenced: [filePath], suggestedActions: [] }

Build projectContextJson by querying:
- projects table (db type, name)
- registered_repos (service list)
- dependency_graph (top 50 most-referenced tables)
- recent incidents (last 5 from incidents table)
"""

# ── IMPORTANT ENV VARS ───────────────────────────────────────────
# ANTHROPIC_API_KEY=sk-ant-...
# KAFKA_HOST=localhost
# REDIS_HOST=localhost
# DB_URL=jdbc:postgresql://localhost:5432/schemaguard
