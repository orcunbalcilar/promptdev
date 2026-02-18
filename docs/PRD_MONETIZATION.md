# PromptDev Monetization PRD

> **Product Requirements Document — Revenue Strategy**
> Version: 1.0 | Date: 2026-02 | Author: PromptDev Team
> Status: Draft

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Market Context](#market-context)
3. [Core Value Proposition](#core-value-proposition)
4. [Revenue Architecture](#revenue-architecture)
5. [Pricing Tiers](#pricing-tiers)
6. [Outlier Revenue Streams](#outlier-revenue-streams)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Metrics & KPIs](#metrics--kpis)
9. [Competitive Landscape](#competitive-landscape)
10. [Risk Analysis](#risk-analysis)

---

## Executive Summary

PromptDev is an AI-powered development platform that transforms natural language prompts into working code, commits, and pull requests. Unlike IDE-integrated copilots (Cursor, GitHub Copilot) or standalone AI agents (Devin), PromptDev occupies a unique position as a **self-hosted, full-stack development orchestration platform** that works with existing enterprise infrastructure (Bitbucket Server, Jira Server, private repositories).

This PRD outlines a monetization strategy that exploits PromptDev's structural advantages:

- **Zero vendor lock-in** — self-hosted, works with any Git provider and issue tracker
- **Enterprise-grade from day one** — SSO, encrypted secrets, per-user isolation
- **Model-agnostic** — BYOK support means customers bring their own AI keys
- **Workflow-complete** — prompt → code → test → PR → Jira update in a single flow

The strategy avoids the commodity pricing trap of per-seat/per-month SaaS by building revenue around **outcomes delivered** (PRs created, tasks completed, developer hours saved) rather than access granted.

---

## Market Context

### The Problem Space

Developer tools are in a pricing identity crisis:

| Tool                | Model                 | Price     | What You Pay For             |
| ------------------- | --------------------- | --------- | ---------------------------- |
| GitHub Copilot Pro  | Per-seat subscription | $10/mo    | Code completions + chat      |
| GitHub Copilot Pro+ | Per-seat subscription | $39/mo    | Agent mode + premium models  |
| Cursor Pro          | Per-seat subscription | $20/mo    | AI-augmented IDE             |
| Cursor Ultra        | Per-seat subscription | $200/mo   | 20x model usage              |
| Devin Core          | Usage-based (ACU)     | $2.25/ACU | Autonomous agent compute     |
| Devin Team          | Subscription + usage  | $500/mo   | 250 ACUs + advanced features |

**Key observations:**

1. **The market is splitting** — Low-end (Copilot $10/mo) vs high-end (Devin $500+/mo, Cursor Ultra $200/mo)
2. **Usage-based is winning** — Devin's ACU model and Copilot's "premium requests" signal a shift from flat-rate to consumption
3. **Enterprise buyers want outcomes, not tokens** — CIOs care about "time to PR" not "requests per month"
4. **Self-hosted demand is underserved** — Regulated industries (finance, healthcare, defense) can't send code to cloud AI agents
5. **Every player bundles AI compute cost** — Nobody lets enterprises truly bring their own models at zero markup

### The Opportunity

PromptDev sits in the **$0 AI compute cost** sweet spot:

- The customer provides their own Copilot SDK token or BYOK API key
- PromptDev orchestrates, doesn't inference — the AI cost is the customer's, not ours
- This makes PromptDev's unit economics fundamentally different from Cursor/Devin/Copilot
- We charge for **orchestration value**, not **compute passthrough**

---

## Core Value Proposition

### For Individual Developers

> "Describe a feature, get a pull request. Stop context-switching between IDE, terminal, Git, and Jira."

- Save 2-4 hours per feature on the mechanical workflow of branch → code → test → commit → push → PR → Jira update
- Work with 14+ AI models and choose the best one per task
- Iterative sessions that self-correct until tests pass

### For Engineering Teams

> "Turn your backlog into a sprint factory. Every Jira ticket becomes a candidate for AI execution."

- Auto-poll Jira for new tickets and create tasks
- Scheduled maintenance, code review, test coverage, security audits — all running on cron
- Real-time monitoring dashboard for all agent activity
- Per-user token isolation — no shared secrets

### For Enterprises

> "Air-gapped AI development. Your code never leaves your infrastructure."

- Full self-hosted deployment (Podman/Docker)
- Works with Bitbucket Server and Jira Server (on-premise)
- AES-256-GCM encryption for all secrets
- Zero data sent to PromptDev — we ship software, not a service

---

## Revenue Architecture

### Primary Model: Orchestration License (Self-Hosted)

PromptDev is not a SaaS. It's **infrastructure software** — like GitLab, Jenkins, or Jira Server. The customer runs it on their own hardware. Revenue comes from licensing the orchestration engine, not hosting it.

This is the outlier decision: **Don't be a SaaS. Be a platform license.**

Why:

- SaaS AI tools are in a race to zero (Copilot Free exists, Cursor Hobby is free)
- Self-hosted avoids competing on AI compute cost (the customer pays their own models)
- Enterprise buyers pay more for software they control
- License revenue is recognized upfront with annual renewals — better cash flow than monthly SaaS churn

### Revenue Stack

```
┌─────────────────────────────────────────────────┐
│              Enterprise License                  │  ← Annual license + support
│         (self-hosted, unlimited users)           │
├─────────────────────────────────────────────────┤
│            Professional License                  │  ← Annual license
│         (self-hosted, team features)             │
├─────────────────────────────────────────────────┤
│              Cloud Hosted                        │  ← Monthly subscription
│         (PromptDev-managed SaaS)                 │
├─────────────────────────────────────────────────┤
│            Marketplace Add-ons                   │  ← Skills, templates, integrations
├─────────────────────────────────────────────────┤
│          Outcome-Based Pricing                   │  ← Per successful PR / per task
└─────────────────────────────────────────────────┘
```

---

## Pricing Tiers

### Tier 1: Community Edition (Free, Open Source Core)

**Target:** Individual developers, open-source contributors, evaluators

| Feature                           | Included |
| --------------------------------- | -------- |
| Single user                       | ✓        |
| Local workspace support           | ✓        |
| 3 concurrent tasks                | ✓        |
| BYOK model support                | ✓        |
| Copilot SDK integration           | ✓        |
| Real-time SSE streaming           | ✓        |
| Basic activity stream             | ✓        |
| Community support (GitHub Issues) | ✓        |

**Price:** $0 forever

**Purpose:** Developer adoption funnel. Build community. Capture mindshare. The free tier should be genuinely useful for solo developers — not crippleware.

---

### Tier 2: Professional ($29/user/month or $290/user/year)

**Target:** Small teams (2-20 developers), startups, agencies

| Feature                                  | Included |
| ---------------------------------------- | -------- |
| Everything in Community                  | ✓        |
| Unlimited concurrent tasks               | ✓        |
| Bitbucket / GitHub / GitLab integration  | ✓        |
| Jira integration (polling + auto-create) | ✓        |
| Scheduled jobs (all 7 types)             | ✓        |
| Iterative sessions                       | ✓        |
| Team dashboard & monitoring              | ✓        |
| Slack bot integration                    | ✓        |
| CLI management tool                      | ✓        |
| 14+ model selection                      | ✓        |
| Email support (48h SLA)                  | ✓        |

**Price justification:** $29/user/month is 50% cheaper than Cursor Pro+ ($60), positioned between Copilot Pro ($10) and Cursor Pro ($20) but delivering **full workflow automation**, not just code suggestions. The value prop is clear: "Copilot suggests code. PromptDev ships features."

---

### Tier 3: Enterprise ($99/user/month or $990/user/year, minimum 25 seats)

**Target:** Mid-to-large engineering organizations (25-500+ developers)

| Feature                                  | Included |
| ---------------------------------------- | -------- |
| Everything in Professional               | ✓        |
| SSO (SAML/OIDC)                          | ✓        |
| RBAC (role-based access control)         | ✓        |
| Audit logging                            | ✓        |
| Custom system prompts per team           | ✓        |
| Skills marketplace (create & share)      | ✓        |
| Priority support (4h SLA)                | ✓        |
| Dedicated Slack channel                  | ✓        |
| SLA guarantee (99.9% uptime for managed) | ✓        |
| Multi-instance deployment                | ✓        |
| Custom integration development           | ✓        |

**Price justification:** $99/user/month (~$1200/year) competes with Devin Team ($500/mo flat + ACUs) but includes unlimited users within the seat count and zero AI compute markup. For a 50-person team: $59,400/year for PromptDev vs $72,000/year for Devin (at 250 ACUs/mo) + their own Copilot/model costs.

---

### Tier 4: Custom Enterprise (Contact Sales)

**Target:** Regulated industries — finance, healthcare, defense, government

| Feature                                         | Included |
| ----------------------------------------------- | -------- |
| Everything in Enterprise                        | ✓        |
| Air-gapped deployment support                   | ✓        |
| On-premise installation services                | ✓        |
| Custom model integration (private LLMs)         | ✓        |
| Compliance documentation (SOC2, HIPAA, FedRAMP) | ✓        |
| Dedicated customer success manager              | ✓        |
| Custom SLA (99.99%)                             | ✓        |
| Source code escrow                              | ✓        |
| Quarterly business reviews                      | ✓        |

**Price:** Starting at $150,000/year (organization-wide license, unlimited seats)

---

## Outlier Revenue Streams

These are the "think out of the box" strategies that differentiate PromptDev from conventional developer tool monetization:

### 1. Outcome-Based Pricing (Pay-Per-PR)

**The radical idea:** Instead of charging for access, charge for results.

| Outcome                           | Price           |
| --------------------------------- | --------------- |
| Successful PR created             | $5-15 per PR    |
| Task completed with passing tests | $3-10 per task  |
| Scheduled job execution           | $1-3 per run    |
| Code review completed             | $2-5 per review |

**Why this is outlier:** No AI coding tool charges per outcome today. They all charge for access or compute. But engineering leaders don't budget for "AI requests" — they budget for "features shipped." Outcome-based pricing aligns PromptDev's revenue with the customer's actual value received.

**Implementation:** Track successful outcomes (PRs merged, tasks completed, tests passing). Offer as an alternative to subscription: "Pay $0/month, $10/PR." This naturally caps downside risk for buyers ("If the AI doesn't deliver, I don't pay") and creates viral adoption (every successful PR proves value).

**Hybrid option:** Professional tier with 50 PRs/month included, then $8/PR overage. This creates a natural upgrade path as usage grows.

---

### 2. Skills Marketplace (Revenue Share Platform)

**The concept:** PromptDev's skills system (system prompt customization + framework-specific instructions) becomes a marketplace.

| Marketplace Item     | Example                                                  | Revenue Model            |
| -------------------- | -------------------------------------------------------- | ------------------------ |
| Framework Skills     | "Next.js 16 best practices", "Spring Boot 4 patterns"    | $5-20/skill, 70/30 split |
| Industry Templates   | "HIPAA-compliant API scaffold", "PCI-DSS checkout flow"  | $20-100/template         |
| Integration Packs    | "Salesforce API connector", "Stripe billing integration" | $10-50/pack              |
| Custom Model Configs | "Fine-tuned prompt chains for React refactoring"         | $5-30/config             |

**Why this is outlier:** Creates a two-sided marketplace dynamic. Third-party developers build skills, PromptDev takes 30% of revenue. Skills are moated — they're specific to PromptDev's orchestration engine and can't be trivially ported to other tools.

**Implementation roadmap:**

1. **Phase 1:** Curated skills library (free, bundled with Professional+)
2. **Phase 2:** Community submissions with review process
3. **Phase 3:** Full marketplace with ratings, revenue share, and skill analytics

---

### 3. Development Time Insurance (Guaranteed Delivery SLA)

**The radical idea:** Sell a guarantee, not a tool.

> "If PromptDev's AI agent can't produce a mergeable PR for your task within 24 hours, we refund the task cost and a human engineer from our partner network takes over at no extra charge."

**Why this is outlier:** This flips the AI tool risk model entirely. Every other tool says "here's an AI, good luck." PromptDev would say "here's a guarantee." This is inspired by insurance and money-back guarantee models, but applied to software delivery.

**Implementation:**

- Partner with freelance engineering platforms (Toptal, Upwork Pro, etc.)
- Only available for Enterprise tier
- Guaranteed delivery for tasks classified as "standard" (CRUD features, API integrations, bug fixes, test coverage)
- Exception for novel architecture, greenfield design, or research tasks

**Revenue model:** Premium pricing ($200-500/guaranteed task), with the actuarial bet that AI completes 85%+ of standard tasks successfully, making the human-fallback cost manageable.

---

### 4. Sprint-as-a-Service (AI Sprint Factory)

**The concept:** Package PromptDev as a managed sprint execution service.

> "Upload your Jira board. We run an AI sprint. You review and merge the PRs."

| Package           | Scope                                           | Price          |
| ----------------- | ----------------------------------------------- | -------------- |
| Sprint Lite       | Up to 10 Jira tickets, standard features        | $2,000/sprint  |
| Sprint Standard   | Up to 25 tickets, complex features              | $5,000/sprint  |
| Sprint Enterprise | Up to 50 tickets, full-stack features + reviews | $10,000/sprint |

**Why this is outlier:** This positions PromptDev not as a tool but as a **service** that competes with outsourced development agencies. A 2-week sprint with a 5-person offshore team costs $15,000-30,000. PromptDev's AI sprint costs $2,000-10,000 and delivers in hours.

**Implementation:**

- Customer connects Jira board
- PromptDev auto-triages tickets, creates tasks, and runs AI agents in parallel
- Human QA reviewer (PromptDev staff or partner) validates PRs before delivery
- Customer receives a batch of ready-to-merge PRs

---

### 5. Developer Productivity Analytics (Data Play)

**The concept:** PromptDev captures rich telemetry on AI-assisted development. Sell anonymized, aggregated insights to engineering leaders.

| Data Product                     | Audience                  | Price                     |
| -------------------------------- | ------------------------- | ------------------------- |
| AI Productivity Benchmark Report | CTOs, VPs of Engineering  | $5,000-15,000/year        |
| Model Effectiveness Dashboard    | Team leads                | Included in Enterprise    |
| Time-to-PR Analytics             | Engineering managers      | Included in Professional+ |
| Industry Benchmarking API        | HR tech, consulting firms | $25,000+/year             |

**Why this is outlier:** GitHub has DORA metrics, LinearB has cycle time. Nobody has **AI-augmented development productivity metrics** because nobody has the data. PromptDev's position as orchestrator (not IDE plugin) means we see the complete workflow: prompt quality → model selection → iteration count → test pass rate → PR merge rate.

**Privacy-first approach:** All analytics are opt-in, anonymized, and aggregated. No source code leaves the customer's infrastructure. Only metadata (task type, model used, iteration count, outcome, duration) feeds the analytics engine.

---

### 6. White-Label / OEM Licensing

**The concept:** License PromptDev's orchestration engine to other companies that want to embed AI-powered development into their platforms.

| OEM Buyer                                | Use Case                              | Revenue         |
| ---------------------------------------- | ------------------------------------- | --------------- |
| DevOps platforms (GitLab, Azure DevOps)  | Embedded AI agent for PR automation   | $500K-2M/year   |
| Consulting firms (Accenture, Deloitte)   | White-labeled AI dev tool for clients | $200K-1M/year   |
| Cloud providers (AWS, Azure, GCP)        | Marketplace offering                  | Revenue share   |
| Education platforms (Pluralsight, Udemy) | AI coding lab environment             | $100K-500K/year |

**Why this is outlier:** Most developer tools try to be the end product. PromptDev's modular architecture (Copilot SDK orchestration, SSE streaming, multi-model routing) is valuable as infrastructure that other products build on top of.

---

## Implementation Roadmap

### Phase 1: Foundation (Months 1-3)

**Goal:** Launch Community and Professional tiers

| Task                        | Priority | Description                                                  |
| --------------------------- | -------- | ------------------------------------------------------------ |
| License system              | P0       | License key validation, feature gating, seat counting        |
| Usage telemetry             | P0       | Anonymous usage tracking (opt-in) for outcome-based metrics  |
| Stripe integration          | P0       | Billing for Professional tier (subscription + usage overage) |
| Community Edition packaging | P1       | Podman/Docker image with feature flags for free tier                |
| Documentation site          | P1       | Docs, pricing page, comparison charts                        |

### Phase 2: Enterprise (Months 4-6)

**Goal:** Launch Enterprise tier with SSO, RBAC, audit logging

| Task               | Priority | Description                                       |
| ------------------ | -------- | ------------------------------------------------- |
| SAML/OIDC SSO      | P0       | Enterprise authentication                         |
| RBAC system        | P0       | Role-based permissions (admin, developer, viewer) |
| Audit logging      | P0       | All actions logged with actor, timestamp, details |
| Outcome tracking   | P1       | Track PRs created, tasks completed, tests passed  |
| Pay-per-PR billing | P1       | Alternative billing model based on outcomes       |

### Phase 3: Marketplace & Differentiation (Months 7-12)

**Goal:** Launch Skills Marketplace, Sprint-as-a-Service, Analytics

| Task                       | Priority | Description                                         |
| -------------------------- | -------- | --------------------------------------------------- |
| Skills Marketplace v1      | P0       | Upload, discover, install skills with revenue share |
| Sprint-as-a-Service pilot  | P1       | Managed sprint execution for 5 design partners      |
| Productivity Analytics v1  | P1       | Dashboard with AI-augmented dev metrics             |
| White-label SDK            | P2       | OEM-ready packaging of orchestration engine         |
| Development Time Insurance | P2       | Pilot with 3 enterprise customers                   |

---

## Metrics & KPIs

### North Star Metric

**Net Developer Hours Saved per Month** — The total hours of developer time saved across all PromptDev customers, measured by (manual baseline time - AI-assisted time) per task type.

### Revenue Metrics

| Metric                    | Target (Year 1) | Target (Year 2) |
| ------------------------- | --------------- | --------------- |
| ARR                       | $500K           | $3M             |
| Paying customers          | 50              | 300             |
| Average deal size         | $10K/year       | $12K/year       |
| Monthly recurring revenue | $42K            | $250K           |
| Pay-per-PR revenue share  | 10% of total    | 25% of total    |
| Net revenue retention     | >110%           | >120%           |

### Product Metrics

| Metric                               | Target      |
| ------------------------------------ | ----------- |
| Free → Professional conversion       | 5-8%        |
| Professional → Enterprise conversion | 15-20%      |
| Monthly active users (Community)     | 5,000+      |
| PRs created per active user/month    | 15+         |
| Task completion rate (tests pass)    | 70%+        |
| Time-to-first-PR (new user)          | <30 minutes |

### Marketplace Metrics (Phase 3+)

| Metric                            | Target     |
| --------------------------------- | ---------- |
| Skills published                  | 100+       |
| Third-party skill creators        | 50+        |
| Marketplace GMV                   | $50K/month |
| Attach rate (skills per customer) | 3+         |

---

## Competitive Landscape

### Positioning Matrix

```
                    IDE-Integrated ◄──────────────────► Standalone Platform
                         │                                    │
                         │  GitHub Copilot    Cursor           │
    Low-end              │  ($10-39/mo)       ($20-200/mo)    │
    (Code suggestions)   │                                    │
                         │                                    │
                         ├────────────────────────────────────┤
                         │                                    │
    Mid-range            │               PromptDev            │
    (Workflow automation) │          ($29-99/user/mo)         │
                         │     self-hosted + outcome-based    │
                         │                                    │
                         ├────────────────────────────────────┤
                         │                                    │
    High-end             │                        Devin       │
    (Autonomous agent)   │                    ($500+/mo)      │
                         │                                    │
```

### Competitive Advantages

| Dimension                 | PromptDev          | GitHub Copilot | Cursor       | Devin        |
| ------------------------- | ------------------ | -------------- | ------------ | ------------ |
| Self-hosted               | ✓ Full             | ✗ Cloud only   | ✗ Cloud only | ✗ Cloud only |
| BYOK (zero AI markup)     | ✓                  | ✗              | ✗            | ✗            |
| Full workflow (prompt→PR) | ✓                  | Partial        | ✗            | ✓            |
| Jira integration          | ✓ Native           | ✗              | ✗            | ✗            |
| On-premise VCS            | ✓ Bitbucket Server | ✗              | ✗            | Partial      |
| Outcome-based pricing     | ✓ (planned)        | ✗              | ✗            | ✗            |
| Open source core          | ✓ (planned)        | ✗              | ✗            | ✗            |
| Scheduled automation      | ✓ 7 job types      | ✗              | ✗            | Partial      |

### Why PromptDev Wins in Each Scenario

**Regulated Enterprise (finance, healthcare):** "Code can't leave our network. We need self-hosted. Copilot/Cursor/Devin are not an option."

**Cost-Conscious Startup:** "We already pay for Copilot tokens. Why pay again for compute? BYOK means PromptDev orchestration is the only added cost."

**Large Engineering Org:** "We need Jira-connected automation at scale. Nobody else does prompt→Jira→branch→code→test→PR→Jira update in a single flow."

**Agency/Consultancy:** "Sprint-as-a-Service lets us deliver client work at 5x the speed for 3x the margin."

---

## Risk Analysis

### Risk 1: Copilot SDK Dependency

**Threat:** GitHub changes Copilot SDK terms, pricing, or availability.

**Mitigation:** BYOK provider support already exists. Expand to support direct OpenAI, Anthropic, Google, and open-source model APIs (Ollama, vLLM) as first-class citizens. The orchestration engine should be model-provider agnostic.

### Risk 2: Race to Zero on AI Coding Tools

**Threat:** GitHub Copilot Free and Cursor Hobby make basic AI coding free.

**Mitigation:** PromptDev's value is workflow automation, not code suggestions. "Free code suggestions" don't threaten "automated PR creation from Jira tickets." Stay above the commodity layer.

### Risk 3: Enterprise Sales Cycle Length

**Threat:** Enterprise license deals take 6-12 months to close.

**Mitigation:** The open-source Community Edition acts as bottom-up adoption. Developers use it free, prove value, and champion internal procurement. Supplement with self-serve Professional tier for immediate revenue.

### Risk 4: AI Quality / Hallucination Risk

**Threat:** AI-generated PRs have bugs, security issues, or fail code review.

**Mitigation:**

- Iterative sessions with test validation
- Skills system for framework-specific best practices
- Code review integration
- Outcome-based pricing naturally aligns incentives (don't charge for failed tasks)

### Risk 5: Support Burden for Self-Hosted

**Threat:** Self-hosted customers need extensive setup support, eating margins.

**Mitigation:**

- Podman Compose + one-command installer already works
- Invest in documentation and troubleshooting guides
- Community Edition builds a support community (GitHub Issues, Discord)
- Enterprise tier includes dedicated support to justify premium pricing

---

## Appendix A: Revenue Projections

### Year 1 Scenario (Conservative)

| Revenue Stream                              | Customers   | Revenue      |
| ------------------------------------------- | ----------- | ------------ |
| Professional ($290/user/year × avg 5 users) | 30 teams    | $43,500      |
| Enterprise ($990/user/year × avg 50 users)  | 5 companies | $247,500     |
| Custom Enterprise                           | 2 contracts | $300,000     |
| Pay-per-PR (overage)                        | Various     | $15,000      |
| **Total ARR**                               |             | **$606,000** |

### Year 2 Scenario (Growth)

| Revenue Stream                | Customers        | Revenue        |
| ----------------------------- | ---------------- | -------------- |
| Professional                  | 150 teams        | $217,500       |
| Enterprise                    | 20 companies     | $990,000       |
| Custom Enterprise             | 5 contracts      | $750,000       |
| Pay-per-PR                    | Various          | $150,000       |
| Skills Marketplace (30% take) | 100 skills       | $50,000        |
| Sprint-as-a-Service           | 10 sprints/month | $600,000       |
| Analytics/OEM                 | 3 contracts      | $200,000       |
| **Total ARR**                 |                  | **$2,957,500** |

---

## Appendix B: Go-to-Market Priorities

### Developer-First Distribution

1. **Open source Community Edition** — GitHub stars, HackerNews, Dev.to, Reddit `/r/programming`
2. **Content marketing** — "We shipped 50 PRs in one day with AI" case studies
3. **Developer advocates** — YouTube demos, conference talks, podcast appearances
4. **Integrations story** — "Works with your existing Bitbucket + Jira" resonates with enterprises already invested in Atlassian

### Enterprise Sales Motion

1. **Bottom-up adoption** — Community Edition proves value before procurement
2. **Champion enablement** — ROI calculator ("X hours saved × Y developer cost = Z savings")
3. **Proof of concept** — 30-day Enterprise trial with dedicated support
4. **Expansion** — Land with one team, expand org-wide via outcome metrics

### Key Messaging

| Audience             | Message                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| Individual developer | "Stop writing boilerplate. Describe what you want, get a PR."            |
| Team lead            | "Turn your Jira backlog into a sprint factory."                          |
| VP of Engineering    | "Ship 3x more features without hiring. Self-hosted, secure."             |
| CTO / CIO            | "Air-gapped AI development. Your code never leaves your infrastructure." |
| CFO                  | "Pay for PRs delivered, not seats occupied."                             |

---

_This document is a living PRD. All pricing, projections, and timelines are subject to validation through customer discovery and market testing._
