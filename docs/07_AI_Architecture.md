# AI Architecture Blueprint
### Enterprise AI Resume Builder — Official AI Architecture Guide

**Audience:** Backend engineering team
**Scope:** AI layer design only (no business logic, no provider implementations, no prompts)
**Stack context:** Java 21 / Spring Boot backend, React 19 frontend, MySQL, JWT auth

---

## 1. AI Philosophy

### 1.1 Why AI must be isolated from business logic

A resume-builder's business logic (resume storage, versioning, user accounts, billing) has a different rate of change, different failure modes, and different testing needs than "call a language model and get text back." If `ResumeService` directly calls `OpenAiClient.chat(...)`, every business use case becomes coupled to:

- A specific vendor's SDK and request/response shape
- That vendor's outages, rate limits, and pricing
- That vendor's prompt format quirks

This means a Gemini price cut, an Anthropic model deprecation, or an OpenAI outage forces a change in code that has nothing to do with resumes. Isolation via a dedicated **AI Layer** means business services depend only on a stable internal contract (e.g., "generate resume summary from these facts"), never on any specific vendor.

### 1.2 Why the application should never depend directly on a provider SDK

Direct dependency on `openai-java`, `google-genai`, or `anthropic-sdk-java` inside business code creates:

- **Vendor lock-in** — switching providers means rewriting business services, not just a config change.
- **Untestable code** — business logic can't be unit tested without mocking a third-party SDK deeply embedded in it.
- **Blast radius** — an SDK breaking change (version bump) can break resume generation, cover letters, ATS scoring, etc. all at once.
- **Compliance risk** — provider-specific request/response objects leak vendor data shapes into domain models.

The correct dependency direction (Dependency Inversion Principle): business logic depends on an **internal AI Gateway interface**; provider SDKs are hidden behind adapters that implement that interface.

### 1.3 Why provider abstraction matters

The system must support OpenAI, Gemini, Claude today, and Azure OpenAI, Ollama, LM Studio tomorrow — **without modifying business services**. This is only possible if:

- All providers are accessed through one **Provider Interface** (Strategy Pattern)
- A **Provider Factory** selects the concrete implementation at runtime
- Business code calls the interface, never a concrete class

This also enables **model routing** (cheapest/fastest/best model per task), **A/B testing between providers**, and **graceful fallback** when a provider is down — all invisible to business logic.

### 1.4 Why prompts should not be hardcoded

Hardcoded prompts embedded in Java strings are:

- Impossible to version safely (a prompt fix requires a full deploy)
- Impossible for non-engineers (prompt/content specialists) to iterate on
- Impossible to A/B test or roll back independently of code
- A source of duplication across workflows (e.g., "resume tone" logic copy-pasted in 5 places)

Prompts are **content, not code**, and should be externalized to a **Prompt Repository**, managed like structured, versioned assets, with variables and localization layered in.

### 1.5 Why AI responses require validation

LLMs are **non-deterministic, unverified text generators**. Without validation, an AI Resume Builder risks:

- Injecting hallucinated job titles, dates, or skills into a user's legal document (their resume)
- Returning malformed JSON that crashes downstream parsing
- Leaking system prompts or internal instructions back to the user
- Producing biased, offensive, or ATS-breaking content

Every AI response must pass through a **Response Processing pipeline** (parsing → validation → sanitization → confidence check) before it is trusted by any business service — the same way you would never trust unvalidated user input.

### 1.6 Recommended architecture

**Layered / Ports-and-Adapters (Hexagonal) architecture**, combined with:

- **Strategy Pattern** for interchangeable AI providers
- **Factory Pattern** for provider instantiation/selection
- **Adapter Pattern** for translating each vendor's SDK into the internal contract
- **Gateway/Facade Pattern** as the single entry point business services use

```
┌───────────────────────────────────────────────────────────┐
│                     Business Services                      │
│   ResumeService · CoverLetterService · ATSService · etc.   │
└───────────────────────────┬─────────────────────────────────┘
                             │  (depends only on this)
                             ▼
┌───────────────────────────────────────────────────────────┐
│                        AI GATEWAY                           │
│         (single façade — the only entry point to AI)        │
└───────────────────────────┬─────────────────────────────────┘
                             ▼
        ┌────────────────────────────────────────┐
        │   Orchestration: Prompt Mgr · Retry ·   │
        │   RateLimit · Cost · Validator · Logger │
        └───────────────────┬──────────────────────┘
                             ▼
                    ┌──────────────────┐
                    │  Provider Factory │  (Strategy selection)
                    └────────┬──────────┘
              ┌──────────────┼───────────────┐
              ▼              ▼               ▼
        OpenAI Adapter  Gemini Adapter  Claude Adapter  (+ future adapters)
```

This is the industry-standard pattern for enterprise "AI Gateway" designs (similar in spirit to how payment gateways abstract Stripe/PayPal/Razorpay).

---

## 2. AI Module Architecture

### 2.1 Component responsibilities

| Component | Responsibility |
|---|---|
| **AI Gateway** | Single public entry point for all AI operations. Business services call only this. Orchestrates the full request lifecycle: prompt resolution → provider selection → invocation → validation → logging. |
| **AI Provider Interface** | The Strategy contract (e.g., `AiProvider`) every vendor adapter implements: `generate(request) -> response`. Defines the vendor-agnostic request/response shape. |
| **Provider Factory** | Resolves which concrete `AiProvider` implementation to use, based on config, task type, cost policy, or failover state. Hides `new OpenAiAdapter()` etc. from the rest of the system. |
| **Prompt Manager** | Resolves the correct prompt template for a given workflow + version + locale, injects variables, and hands a final prompt payload to the Gateway. |
| **Prompt Repository** | Persistence/storage layer for prompt templates, versions, metadata, and approval state (backed by MySQL, not hardcoded). |
| **Response Parser** | Converts raw provider output (text/JSON/tool-calls) into a structured internal DTO, independent of vendor response format. |
| **Output Validator** | Applies schema checks, business rules, and safety checks to parsed output; rejects or flags invalid responses. |
| **Retry Manager** | Handles transient failures (timeouts, 5xx, rate-limit errors) with backoff policies, independent of business logic. |
| **Rate Limit Manager** | Enforces per-user, per-tenant, and per-provider throughput limits to protect both cost and provider quotas. |
| **Cost Tracker** | Computes cost per request from token counts and provider pricing tables; aggregates spend by user/tenant/feature. |
| **Usage Logger** | Structured, queryable audit log of every AI interaction (who, what workflow, which provider, tokens, latency, outcome). |
| **Token Calculator** | Estimates/measures token counts pre- and post-call for cost prediction, context-window management, and truncation decisions. |
| **AI Configuration Manager** | Central source of truth for provider credentials references, model selection policy, feature flags, and environment-specific settings. |

### 2.2 Interaction flow (sequence)

```
Business Service
     │  1. requestGeneration(workflow, context)
     ▼
AI Gateway
     │  2. resolvePrompt() ──────────────► Prompt Manager ──► Prompt Repository
     │  3. estimateTokens() ─────────────► Token Calculator
     │  4. checkQuota() ──────────────────► Rate Limit Manager
     │  5. selectProvider() ──────────────► Provider Factory ──► AI Provider Interface
     │  6. invoke() (with Retry Manager wrapping the call)
     │  7. parse() ────────────────────────► Response Parser
     │  8. validate() ─────────────────────► Output Validator
     │  9. recordCost() ───────────────────► Cost Tracker
     │ 10. log() ───────────────────────────► Usage Logger
     ▼
Business Service ◄── validated, structured AiResult
```

Every step is a distinct, independently testable component — no single class does everything ("God Gateway" is an anti-pattern to avoid; the Gateway *orchestrates*, it does not *implement* each concern).

---

## 3. Provider Abstraction

### 3.1 Strategy + Factory design

- **AI Provider Interface (Strategy)**: one contract, e.g. conceptually `generate(AiRequest) -> AiResponse`, `supportsStreaming()`, `getCapabilities()`. Every provider — OpenAI, Gemini, Claude, Azure OpenAI, Ollama, LM Studio — implements this same contract via its own **Adapter**.
- **Adapters** translate the vendor's native SDK/API shape (different auth, different request bodies, different response formats — e.g., Claude's content blocks vs. OpenAI's choices array vs. Gemini's candidates array) into the single internal `AiRequest`/`AiResponse` model.
- **Provider Factory** decides, at request time, which adapter to instantiate/use, based on:
  - Static configuration (default provider per environment)
  - Task-based routing (e.g., "cover letters → Claude", "keyword extraction → cheaper model")
  - Runtime health (failover to a backup provider if the primary is unavailable)
  - Cost policy (route to cheapest capable provider under budget pressure)

### 3.2 Provider capability matrix

| Capability | OpenAI | Gemini | Claude | Azure OpenAI (future) | Ollama (future) | LM Studio (future) |
|---|---|---|---|---|---|---|
| Hosting | Cloud | Cloud | Cloud | Cloud (enterprise) | Local/self-hosted | Local/self-hosted |
| Streaming | Yes | Yes | Yes | Yes | Yes | Yes |
| Structured/JSON output | Yes | Yes | Yes | Yes | Model-dependent | Model-dependent |
| Cost model | Per-token | Per-token | Per-token | Per-token + Azure billing | Compute cost only | Compute cost only |
| Data residency control | Vendor-managed | Vendor-managed | Vendor-managed | Configurable (enterprise) | Full (on-prem) | Full (on-prem) |
| Auth mechanism | API key | API key | API key | Azure AD / key | None/local | None/local |

The **Provider Interface must be defined by the lowest common denominator of required capabilities**, with an optional `getCapabilities()` extension so the Gateway can gracefully degrade (e.g., skip streaming for a provider that doesn't support it) rather than failing.

### 3.3 Adding a new provider — conceptual steps (no code)

1. Implement the AI Provider Interface with a new Adapter class for the vendor.
2. Map vendor auth into AI Configuration Manager.
3. Register the adapter with the Provider Factory (config-driven, not a code branch in business logic).
4. Add vendor pricing to Cost Tracker's pricing table.
5. Add vendor-specific error mapping to Retry Manager (what counts as retryable).
6. No business service, controller, or workflow code changes.

This is the concrete test of good abstraction: **a new provider is a new adapter + config entry, never a change to `ResumeService` or any controller.**

---

## 4. Prompt Management

### 4.1 Core concepts

| Concept | Purpose |
|---|---|
| **Prompt Templates** | Structured, parameterized text blueprints per workflow (e.g., "resume-summary-generation"), stored separately from code. |
| **Prompt Versioning** | Every template change creates a new version; workflows reference a version, not "latest," so behavior is reproducible and rollback is trivial. |
| **Prompt Categories** | Organize templates by feature area (Resume, Cover Letter, ATS, Career Advice, Interview Prep) for discoverability and access control. |
| **Prompt Variables** | Typed placeholders (e.g., `{{candidateExperience}}`, `{{targetRole}}`) resolved by the Prompt Manager from business context — never string-concatenated ad hoc. |
| **Localization** | Templates can have locale variants (en-US, hi-IN, etc.) selected by user locale, without duplicating orchestration logic. |
| **Testing Prompts** | A sandbox/staging pipeline where new prompt versions run against golden test cases before promotion, with output diffed against expected quality bars. |
| **Prompt Approval Workflow** | Draft → Review → Approved → Published states; only "Published" versions are servable in production, enforcing a human checkpoint for content quality/safety. |
| **Prompt Rollback** | Because every version is immutable and stored, reverting a workflow to a previous version is a config/pointer change, not a redeploy. |
| **Prompt Reuse** | Common fragments (tone guidelines, formatting rules, safety constraints) are modular "partials" composed into multiple templates rather than duplicated. |
| **Prompt Organization** | Repository structured by category → workflow → version, with metadata (author, model targeted, last tested date, status). |

### 4.2 Prompt lifecycle (state machine)

```
   ┌────────┐   review    ┌──────────┐   approve   ┌───────────┐   publish   ┌───────────┐
   │  Draft │ ───────────►│  Review  │────────────►│ Approved  │────────────►│ Published │
   └────────┘             └──────────┘             └───────────┘             └─────┬─────┘
       ▲                                                                            │
       │                          rollback to prior published version               │
       └────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Why this matters for a resume builder specifically

Resume/cover-letter prompts directly shape a document that affects someone's livelihood. Versioning + approval + testing isn't bureaucracy here — it's the mechanism that lets you say "we know exactly which prompt version produced this resume, and we can prove it went through review."

---

## 5. AI Workflows (conceptual, request → validated response)

Each workflow below follows the same skeleton through the AI Gateway; only the prompt template, provider routing, and validation rules differ.

| Workflow | Key Input Context | Special Validation Focus |
|---|---|---|
| **Resume Generation** | User's raw work history, education, skills | No fabricated employers/dates; structured section output; length limits |
| **Resume Improvement** | Existing resume text + target role | Original facts preserved (no invented achievements); diff-based review |
| **Cover Letter Generation** | Resume + job description | Tone consistency; no fabricated company claims; length constraints |
| **ATS Optimization** | Resume + job description | Suggestions only — never silently rewrites; keyword relevance check |
| **Keyword Suggestions/Extraction** | Job description text | Structured list output (schema-validated), deduplicated |
| **Job Match Analysis** | Resume + job description | Score must be explainable (reasoning attached); bounded numeric range |
| **Career Advice** | User profile + goals | Non-prescriptive framing; disclaimers on subjective guidance |
| **Interview Preparation** | Resume + target role | Question relevance to actual resume content; no generic filler passed off as personalized |

### 5.1 Generic workflow sequence

```
1. Frontend request → Controller → Business Service
2. Business Service builds a context object (facts only, no prompt text)
3. Business Service calls AI Gateway.execute(workflowType, context)
4. Gateway: Prompt Manager resolves template + version + locale
5. Gateway: Rate Limit Manager checks user/tenant quota
6. Gateway: Provider Factory selects provider (policy/failover-aware)
7. Gateway: Retry Manager wraps the provider call
8. Provider Adapter invokes vendor API
9. Response Parser converts raw output → structured DTO
10. Output Validator applies schema + business rules + safety checks
    - PASS  → Cost Tracker records spend, Usage Logger records outcome, return to Business Service
    - FAIL  → Fallback Response strategy triggered (see Part 6), logged as a quality incident
11. Business Service persists/returns validated result to frontend
```

This same shape scales to all eight workflows — none require a different architecture, only different prompt templates and validators, which is the entire point of the abstraction.

---

## 6. Response Processing

| Stage | Purpose |
|---|---|
| **Validation** | Enforce expected schema (JSON shape, required fields, types) before anything touches business data. |
| **Filtering** | Remove/flag disallowed content categories (offensive language, unsafe claims) per workflow policy. |
| **Sanitization** | Strip formatting artifacts, stray markdown, control characters, or accidental system/prompt leakage from output. |
| **Structured Output** | Prefer schema-constrained generation (JSON mode/tool-calling where the provider supports it) over free-text parsing to minimize ambiguity. |
| **Error Detection** | Distinguish provider errors (timeout, 5xx) from content errors (malformed/empty output) and route each to the appropriate handler. |
| **Hallucination Handling** | Cross-check generated facts (names, dates, employers, numbers) against the original user-supplied context; reject or flag mismatches rather than trusting the model. |
| **Fallback Responses** | Pre-defined, safe default behavior when generation fails validation — e.g., return the original unmodified text for "Resume Improvement" rather than a broken AI rewrite. |
| **Confidence Assessment** | Where the provider exposes signals (finish_reason, log-probability-like signals, self-reported uncertainty), factor these into whether output is auto-accepted or flagged for review. |
| **Incomplete Responses** | Detect truncation (hit max tokens / stopped mid-structure) and either retry with adjusted limits or reject explicitly rather than silently truncating a resume. |
| **Malformed Responses** | JSON parse failures, invalid schema → structured error passed to Retry Manager (retry once with stricter instructions) before falling back. |

**Principle:** the Output Validator is the last gate before AI-generated content becomes part of a user's actual resume — treat it with the same rigor as validating untrusted user input, because functionally, that's what it is.

---

## 7. AI Security

| Threat | Architectural Mitigation |
|---|---|
| **Prompt Injection** (user content in resume tricking the model into ignoring instructions) | Strict separation of "system/instruction" content from "user data" content at the template level; treat all user-supplied text as data, never concatenated into instruction sections; output validated against expected schema regardless of what the model was told. |
| **Sensitive Data / PII in resumes** | Classify resume fields (name, address, phone, national ID equivalents) and apply data-handling policy before any field is sent to a provider — only send what the workflow actually needs. |
| **PII Protection** | Field-level minimization: e.g., ATS keyword extraction doesn't need full contact details; Cost Tracker/Usage Logger must never persist raw PII in logs, only references/hashes. |
| **Data Masking** | Mask/redact identifiers (emails, phone numbers) in logs and analytics pipelines; unmask only within the authenticated request path. |
| **Prompt Leakage** | System instructions never echoed back to the user; Output Validator screens for verbatim reproduction of internal prompt text. |
| **Provider Privacy** | Configuration Manager tracks each provider's data retention/training policy; route sensitive workflows only to providers whose terms meet the org's data policy (a Factory-level routing rule, not a business-logic concern). |
| **Content Filtering** | Pre- and post-generation filtering layer (input: block clearly abusive prompts; output: block disallowed content categories) independent of any one provider's built-in moderation. |
| **Output Validation** | As in Part 6 — schema and business-rule enforcement is itself a security control against malformed/adversarial output. |
| **Abuse Prevention** | Rate Limit Manager + per-user quotas + anomaly detection (e.g., a user generating hundreds of cover letters/minute) feeding into temporary throttling or account flags. |

**Core principle:** security is enforced at the Gateway boundary — every request and response passes through the same choke point regardless of which provider is chosen, so security controls are written once, not per-adapter.

---

## 8. Cost Management

| Strategy | Description |
|---|---|
| **Token Tracking** | Token Calculator measures input/output tokens per request; attached to every Usage Log entry. |
| **Request Logging** | Every AI call logged with workflow, provider, model, tokens, latency, outcome, and computed cost. |
| **Budget Limits** | Per-user, per-tenant, and global monthly budget thresholds enforced by Rate Limit Manager + Cost Tracker; soft warnings before hard cutoffs. |
| **Provider Selection (cost-aware routing)** | Provider Factory can route low-value/high-volume tasks (e.g., keyword extraction) to cheaper models and reserve premium models for high-value tasks (e.g., full resume generation). |
| **Caching** | Cache deterministic/near-deterministic outputs (e.g., ATS keyword lists for an unchanged job description) to avoid redundant paid calls. |
| **Prompt Optimization** | Prompt Manager tracks average token size per template version; flags bloated templates for trimming during prompt review. |
| **Cost Analytics** | Aggregated dashboards: cost per workflow, per provider, per tenant, trended over time. |
| **Usage Reports** | Exportable reports for finance/ops — cost attribution by feature, useful for pricing the product itself. |
| **Quota Management** | Hard per-plan-tier quotas (e.g., free vs. paid users) enforced before a request ever reaches a provider, avoiding wasted spend on requests that will be rejected anyway. |

---

## 9. Reliability

| Strategy | Description |
|---|---|
| **Retries** | Retry Manager applies exponential backoff with jitter, limited to transient/retryable error classes (timeouts, 5xx, rate-limit responses) — never blind retries on content errors. |
| **Timeouts** | Every provider call has an explicit timeout tuned per workflow (e.g., longer for full resume generation, shorter for keyword extraction). |
| **Circuit Breakers** | Trip after repeated provider failures to stop hammering a degraded provider, giving it recovery time and immediately failing fast for new requests. |
| **Fallback Providers** | Provider Factory supports a secondary provider per workflow; circuit-breaker trip triggers automatic failover, transparent to business logic. |
| **Graceful Degradation** | If all AI providers are unavailable, business services fall back to non-AI behavior where possible (e.g., return the user's original resume text unmodified, with a clear "AI suggestions unavailable" status) rather than hard failure. |
| **Rate Limiting** | Protects both the org's provider quotas and downstream system stability. |
| **Queueing** | Long-running/batch workflows (e.g., bulk résumé re-scoring) go through an async queue rather than blocking request threads. |
| **Asynchronous Processing** | Non-latency-critical workflows (career advice, batch ATS scans) processed via async jobs with callback/polling, freeing the Gateway for interactive requests. |
| **Monitoring** | Health checks per provider adapter feed the Circuit Breaker and Observability dashboards (Part 10). |

---

## 10. AI Observability

| Metric Category | What to Track |
|---|---|
| **Latency** | P50/P95/P99 per provider, per workflow. |
| **Token Usage** | Input/output tokens per request, trended by workflow and provider. |
| **Provider Availability** | Uptime/error rate per provider, circuit-breaker state history. |
| **Error Rates** | Broken down by error class: timeout, rate-limit, validation failure, malformed output. |
| **Cost Trends** | Daily/weekly/monthly spend by provider and workflow. |
| **Prompt Success Rates** | % of generations passing Output Validator on first attempt, per prompt version — the key signal for prompt quality regression. |
| **Response Quality Metrics** | Sampled human/automated review scores, hallucination-flag rate, fallback-trigger rate. |
| **Audit Logs** | Immutable record of who requested what, which prompt version and provider were used, and what was returned — required for both debugging and compliance. |

All of this flows from the Usage Logger and Cost Tracker into a central observability store, dashboarded independently of any single provider's own analytics (never rely solely on a vendor's dashboard — that breaks the abstraction and creates a blind spot on provider switch).

---

## 11. Future Expansion

The layered Gateway/Strategy/Factory design accommodates all of the following **without redesigning the AI layer**:

| Future Capability | How it fits without redesign |
|---|---|
| **Multi-Agent Systems** | Modeled as a new orchestration layer *above* the Gateway — agents call the same Gateway per step, just like any business service does today. |
| **Model Routing** | Already a Provider Factory responsibility; extending routing rules is config, not architecture change. |
| **Model Comparison** | Run the same request through multiple providers via the existing interface, compare via Response Processing + Observability metrics. |
| **A/B Testing** | Prompt versioning + provider routing already support splitting traffic by version/provider; add an experiment-assignment layer in the Gateway. |
| **Fine-Tuned Models** | Just another "model" value in provider configuration — the Adapter and Interface don't change. |
| **RAG (Retrieval-Augmented Generation)** | Introduced as a new pre-processing step feeding retrieved context into the Prompt Manager's variable resolution — Gateway contract unchanged. |
| **Knowledge Bases** | Backing store for RAG retrieval; sits alongside the Prompt Repository, not inside it. |
| **Voice AI** | New "modality" adapters implementing an extended Provider Interface variant; Gateway orchestration pattern unchanged. |
| **Image Generation** | Same as Voice AI — new provider category, same Factory/Strategy pattern, new response type in Response Processing. |

The architectural invariant: **new capability = new adapter/provider/prompt category, never a change to how business services talk to the Gateway.**

---

## 12. Development Standards

| Area | Rule |
|---|---|
| **Adding a new AI provider** | Must implement the AI Provider Interface fully; register via configuration, not code branching; must supply pricing data to Cost Tracker and error-classification data to Retry Manager before going live. |
| **Creating prompts** | Must go through Draft → Review → Approved → Published workflow; must include test cases; must be categorized and versioned; no prompt logic embedded in application code. |
| **Updating prompts** | Never edit a published version in place; always create a new version; old versions remain available for rollback. |
| **Logging** | Every AI call must be logged via Usage Logger with correlation IDs; no PII in log payloads beyond what's masked/permitted. |
| **Testing** | Prompt changes require regression testing against golden test cases; provider adapters require contract tests against the Provider Interface; Output Validator rules require unit tests with malformed-input fixtures. |
| **Configuration** | All provider credentials, model names, and routing policy live in AI Configuration Manager (externalized config), never hardcoded or embedded in prompts/code. |
| **Error Handling** | Distinguish and handle separately: transient provider errors, validation failures, and business-rule violations; never swallow AI errors silently. |
| **Documentation** | Every prompt template, provider adapter, and workflow must have an accompanying spec: purpose, inputs, expected output schema, validation rules, owning team. |
| **Code Reviews** | Any change touching the AI Gateway, Provider Interface, or Output Validator requires review from at least one engineer with AI-architecture context, given the blast radius of these shared components. |

---

## 13. Common AI Architecture Mistakes

| # | Mistake | Why It Happens | Why It's Dangerous | Professional Solution |
|---|---|---|---|---|
| 1 | Calling provider SDK directly from business services | Fastest path to a working demo | Total vendor lock-in, untestable code | Route everything through the AI Gateway |
| 2 | Hardcoding prompts as Java string literals | Feels simpler early on | No versioning, no rollback, redeploy for text changes | Externalize to Prompt Repository |
| 3 | No output validation | "The model is usually right" assumption | Hallucinated facts land in user resumes | Mandatory Output Validator stage |
| 4 | No retry/backoff strategy | Happy-path-only development | Transient errors become user-facing failures | Retry Manager with backoff + jitter |
| 5 | Retrying non-retryable errors | Treating all errors the same | Wastes cost, worsens outages, duplicate side effects | Classify errors as retryable vs. terminal |
| 6 | No timeout on provider calls | Default client settings assumed safe | One slow provider call can exhaust thread pools | Explicit per-workflow timeouts |
| 7 | No circuit breaker | Not anticipated until an outage happens | Cascading failures during provider downtime | Circuit breaker per provider adapter |
| 8 | Single-provider hard dependency | Only one provider integrated initially | No fallback during outages/price hikes | Multi-provider Strategy + Factory from day one |
| 9 | No cost tracking | Cost concerns deferred to "later" | Runaway spend discovered only on the invoice | Token Calculator + Cost Tracker from day one |
| 10 | No per-user rate limiting | Assumes users won't abuse the feature | Cost/DoS exposure from a single bad actor | Rate Limit Manager with per-user quotas |
| 11 | Logging full prompts/responses with PII | Convenient for debugging | Compliance violation, data breach surface | Field-level masking before logging |
| 12 | Treating AI output as trusted input | Anthropomorphizing model reliability | Malformed/injected content flows into business data | Treat AI output like untrusted user input |
| 13 | No schema-constrained output | Free-text parsing seems "good enough" | Fragile regex/string parsing breaks silently | Use structured/JSON output modes |
| 14 | Ignoring truncated responses | Truncation isn't obvious without checking finish reason | Silently incomplete resumes/cover letters shipped | Explicit truncation detection + retry/reject |
| 15 | No fallback response strategy | Assumes generation always succeeds | Hard failure shown to end users | Defined safe-fallback per workflow |
| 16 | Mixing system instructions with user data in one string | Simplicity of a single prompt string | Prompt injection via user-controlled fields | Strict instruction/data separation |
| 17 | No prompt injection defenses | Not considered a "real" threat initially | Model manipulated into ignoring safety rules | Validate output regardless of injected instructions |
| 18 | Trusting provider-side moderation alone | Assumes vendor moderation is sufficient | Vendor moderation policies change without notice | Independent content filtering layer |
| 19 | No versioning on prompts | Prompts treated as static config | Can't reproduce or roll back a bad prompt change | Immutable versioned prompt storage |
| 20 | No prompt approval workflow | Move-fast culture | Unreviewed prompts reach production, quality/safety risk | Draft → Review → Approved → Published |
| 21 | Testing prompts only manually in a playground | Fastest iteration loop | Regressions ship silently | Automated golden-test suite per prompt version |
| 22 | No localization strategy for prompts | English-only assumption | Poor quality output for non-English users | Locale-aware Prompt Manager |
| 23 | Duplicating prompt fragments across templates | Copy-paste under deadline pressure | Inconsistent tone/rules, painful maintenance | Reusable prompt partials |
| 24 | No token-budget awareness | Context window ignored until it breaks | Silent truncation or request failures on large resumes | Token Calculator pre-checks before sending |
| 25 | Synchronous calls for long-running workflows | Simpler request/response model | Blocked threads, poor UX for batch operations | Async/queue-based processing |
| 26 | No observability beyond basic logs | Observability deprioritized vs. features | Blind to quality regressions and cost spikes | Dedicated AI observability dashboards |
| 27 | No audit trail of which prompt/provider produced an output | Not considered until a dispute/incident | Can't debug or prove what generated a bad result | Immutable audit log per request |
| 28 | Assuming provider API is 100% deterministic | Misunderstanding of LLM behavior | Flaky "passing" tests, unreliable pipelines | Design tests/validators for variability |
| 29 | Skipping confidence/quality assessment | No signal-based gating in place | Low-quality output shipped as-is | Confidence heuristics + sampling review |
| 30 | Ignoring provider-specific rate limits | Config copied from one provider to another | Unexpected 429s in production | Per-provider rate-limit configuration |
| 31 | No graceful degradation path | AI treated as always-available | Full feature outage when AI is down | Non-AI fallback behavior defined per feature |
| 32 | Embedding API keys in code/config repo | Convenience during early development | Credential leakage | Secrets manager, never in source control |
| 33 | One-size-fits-all model selection | Simplicity of a single default model | Overpaying for simple tasks, underpowered for complex ones | Task-based model routing |
| 34 | No caching of repeat/deterministic requests | Cache invalidation feels complex | Redundant spend on identical requests | Cache layer keyed on normalized input |
| 35 | Not classifying PII fields before sending to providers | PII handling treated as an afterthought | Unnecessary sensitive-data exposure to third parties | Field-level data minimization policy |
| 36 | No plan for provider deprecation/model sunset | Assumes current model lives forever | Sudden breakage when a model is retired | Config-driven model versions, deprecation monitoring |
| 37 | Coupling response parsing to one provider's JSON shape | Fastest way to get output flowing | Breaks the abstraction, blocks multi-provider support | Provider-agnostic internal response DTO |
| 38 | No load testing of the AI layer | AI paths excluded from perf testing | Rate-limit/timeout cascades discovered in production | Include AI Gateway in load/perf test suites |
| 39 | Allowing unlimited free-form user input into prompts | Convenience, minimal input handling | Injection risk, unpredictable token costs | Input length/shape constraints before prompt assembly |
| 40 | No cost attribution by feature/tenant | Cost tracked only in aggregate | Can't identify which feature is driving spend | Cost Tracker dimensioned by workflow + tenant |
| 41 | Treating "AI Gateway" as a place to put all AI code | Convenient dumping ground | Gateway becomes an unmaintainable God Object | Gateway orchestrates; delegates to focused components |
| 42 | No rollback mechanism for bad prompt deploys | Rollback not planned for content changes | Bad prompt stays live until manually diagnosed | Version pointer rollback, no redeploy needed |

---

## Summary

This blueprint establishes an AI layer where:

- **Business services never know which AI provider is in use.**
- **Prompts are managed content, not code.**
- **Every AI response is validated before it can affect a user's resume.**
- **Cost, reliability, and security controls are enforced once, at the Gateway boundary — not duplicated per provider or per feature.**
- **New providers, workflows, and even entirely new AI modalities (voice, image, RAG, agents) can be added as new adapters/components without touching existing business logic.**

This is the architecture the engineering team should implement against, provider by provider, workflow by workflow.
