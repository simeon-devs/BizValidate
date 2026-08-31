# Vision

Where this product is going, who it serves, and what it refuses to become.

`ARCHITECTURE.md` describes how the system works today. This document
describes what it is for. When the two conflict, this one is the argument
and the architecture is the evidence.

---

## 1. What this is

**A validation engine that can defend every number it produces.**

Anyone can ask a language model to score a business plan. What almost
nobody can do is answer the next four questions:

- *Would it say the same thing tomorrow?* — Yes. Temperature 0.1 against
  published behavioural anchors, with a live test asserting the same
  submission scores within a 5-point band, and an A/B gate on every prompt
  change.
- *Where did the number come from?* — A weighted sum computed in code. The
  model scores individual metrics; arithmetic combines them.
- *What is it based on?* — Every metric is labelled **Evidenced** (external
  sources, cited by number and clickable), **Stated** (the founder's claim,
  not verified) or **Inferred** (rubric only). Model-claimed evidence is
  validated against the submission and the cited sources in code; anything
  unsupported is dropped and the count is shown.
- *How was it produced?* — Every report carries a trace of all six pipeline
  steps, which model ran each, how long it took, and the arithmetic written
  out.

That combination — reproducible, sourced, and auditable — is the product.
The AI is a component, not the pitch.

## 2. Why this is needed

Deal screening is expensive and inconsistent. A human panel reading forty
plans is inconsistent *with itself*: the same plan scores differently heard
first or ninth, before lunch or after. Founders, meanwhile, get feedback
that is either polite and useless or brutal and unexplained.

Meanwhile AI-generated business analysis has a credibility problem it
earned honestly: it is fluent, confident, unsourced, and different every
time you ask. The market's objection is not "AI can't analyse a business."
It is **"why should I trust this particular output?"**

That objection is the entire design brief for this system.

## 3. What is defensible — and what is not

**Not defensible.** The model (anyone can call Sonnet). The rubric (Bill
Payne's framework is published; that is a feature — it is citable *because*
it is public). The prompt (copyable in an afternoon).

**Defensible.**

1. **The discipline.** Version-pinned prompts with golden hashes, a live
   consistency gate, an A/B protocol before any scoring change ships,
   validators that prune what the model invents. A competitor can copy the
   prompt in a day and will not reproduce the guarantee, because the
   guarantee is a process, not a string.
2. **The audit surface.** Evidence classes, citations, the pipeline trace,
   provenance. This is what converts a skeptical investment committee, and
   it is months of unglamorous work.
3. **Calibration data — the compounding asset.** Every scored business,
   paired over time with what actually happened to it, is a dataset nobody
   can copy without spending the same years. Today the system can say "this
   case is well-evidenced against the rubric." With outcome data it could
   eventually say "businesses that scored like this raised, or didn't."
   **That is the long-term moat, and capturing outcomes should start
   early** — even a single "what happened to this business?" follow-up
   field, asked six months later, begins the dataset.

## 4. Who this is for

Three audiences, and they do not want the same thing. Naming the tension
matters more than naming the segments.

### Investment firms, accelerators, deal-flow teams

Screening more inbound than they can read. They want **throughput,
consistency across analysts, and something defensible to their own
investment committee and LPs.** They already have opinions; they need a
consistent first pass and an audit trail.

*What they need that others don't:* multi-seat teams and shared pipelines,
batch and comparison views, integration with the systems they already use,
retained history, exportable evidence.

### Individual investors and angels

Fewer deals, no team, price-sensitive, want a fast defensible read on one
opportunity.

**These are not a separate product.** They want the same engine at smaller
scale. Treating them as a third portal would triple surface area to serve a
pricing tier. *They are a plan, not a platform.*

### Founders validating and improving an idea

Want to know whether the idea holds, **what specifically to fix**, and to
walk away with something they can raise with.

*What they need that others don't:* the rubric explained in plain language,
what would move each score, iteration between attempts, and an artifact —
the board-ready PDF, and eventually a public page.

### The tension, stated plainly

**A firm wants a filter. A founder wants a coach.** One is optimising for
"reject this quickly and defensibly"; the other for "help me improve." The
scoring engine serves both identically — the *same* score is a verdict to
one reader and a diagnosis to the other. The interface, pricing, and
workflow around it must differ.

The current product is honest about this in one direction already: the
"What Would Move the Score" section is coaching, and the provenance appendix
is filtering. Both come from the same stored data.

## 5. The wedge — what to lead with

**Honest read: what has been built is a firm's product wearing a founder's
clothes.** No solo founder asked for golden hashes, evidence classes or a
consistency band. An investment committee did — via a reviewer's challenge,
which is exactly where those features came from.

But firms are slow to sell to with zero users and zero track record, and
they will ask for references before they ask for a demo.

**Therefore:**

- **Founders are the wedge** — for volume, learning, and case studies. They
  are reachable, they self-serve, and every validation they run improves
  the calibration dataset. Low price, high volume, immediate feedback on
  whether the analysis is actually useful.
- **Firms are the business** — the revenue, the retention, and the segment
  the differentiator was built for. Sold on the back of usage evidence the
  founder channel produces.
- **Individual investors are a pricing tier** on the firm product, not a
  build.

Sequencing consequence: **do not build three portals.** Build one product
with role-aware surfaces, and let the firm capabilities (teams, batch,
integrations) arrive when a firm has said they will pay for them.

## 6. Product surfaces

Each with why it matters, the real risk, and when it earns its place.

### 6.1 Report Q&A — an assistant that explains the output

**Why:** a report is dense. A reader wants to ask "why is Team 62?" and get
an answer, not hunt through an appendix. Every input needed already exists:
the trace, evidence, anchors, primers, sources.

**The hard constraint that makes or breaks it:** the assistant answers
**only from the stored report and the rubric. It never re-reasons about the
business and never produces a number.** If it can say "actually your team
looks stronger than 62," the consistency guarantee — the whole product — is
dead. Out of scope questions get "the report does not cover that," not a
guess.

Built correctly this is the audit trail made conversational, and it is the
cheapest large win available. **Near-term.**

### 6.2 Platform console (operator admin)

**Why:** once real users exist, running blind is untenable — usage, cost per
validation, error rates, credit balances, failed jobs, which pipeline steps
degrade.

**Note a naming collision to fix:** today's `/admin` is a per-user rubric
editor, not an operator console. It should become `/settings/rubric`, with
`/admin` reserved for the owner-only console. **Near-term, low effort.**

### 6.3 MCP access for firms

**Why this is a genuinely good instinct:** a firm with internal AI tooling
could query BizValidate directly — "score this deck," "how did we score
Acme on team?", "compare these three." That makes the product
*infrastructure inside their workflow* rather than another dashboard to
remember. Things embedded in a workflow do not churn.

**The honest caveat:** it assumes the firm already has AI tooling. Many do
not. MCP should be **an** interface, never **the** interface — a plain REST
API serves the same integrations for everyone else and is a prerequisite
anyway.

**Prerequisites, in order:** organisations and per-org API keys → scoped
REST API → MCP server on top. **After the first firm asks for it.** Building
it before that is building for an imagined buyer.

### 6.4 Teams and organisations

Multi-seat, shared pipeline, roles. Straightforward and necessary for firms.
Its real weight is in the data model — every table currently keys to a
single `user_id`, and org scoping touches all of them. **Do it once,
properly, when the first paying team exists**; retrofitting is painful but
premature multi-tenancy is worse.

### 6.5 Launch tools for founders

The instinct — validate → improve → **launch** — is a real journey, and the
strongest reason a founder returns.

**Where the line sits:**

- ✅ **A generated one-page site from the validated business.** Everything
  needed already lives in `report_data`, and the PDF proves the same
  data can be rendered into a designed artifact. This is a natural
  extension and a conversion moment.
- ✅ **A free subdomain** (`name.bizva.io`) and letting a founder point
  their own domain at it via CNAME. Cheap, no ongoing obligations.
- ❌ **Buying and reselling domains.** That makes you a registrar with
  billing, renewals, transfers, disputes and abuse handling — permanent
  operational weight for a one-time convenience.
- ❌ **A website builder.** Different product, different competitors
  (Framer, Wix, Lovable, v0), different engineering discipline. Entering
  that market as a side feature is how a focused product dies.

**One page, not a builder. A subdomain, not a registrar.**

## 7. Business model

### What a validation actually costs (measured, not estimated)

| Component | Detail | Cost |
|---|---|---|
| Scoring (Sonnet 4.5, temp 0.1) | ~3.6k input / ~4.1k output tokens | ~$0.073 |
| Extraction + verification (Haiku 4.5) | two calls | ~$0.007 |
| Embedding (drift gate) | text-embedding-3-small | <$0.001 |
| Research (Tavily) | 5 targeted queries, advanced depth, 10 credits | ~$0.080 |
| **Fresh validation** | | **≈ $0.16–0.20** |
| Re-validation caught by the drift gate | embedding only | ≈ $0.001 |
| Cached research (same region+industry, 24h) | | −$0.08 |

Two facts worth designing around: **a re-run of the same business is
essentially free to serve** — so it should be free to the user, which is
also a trust signal — and **research is nearly half the marginal cost**,
which the per-query cache already attacks.

### Credits and subscription — both, not either

The instinct was right and the doubt ("I guess it can't work") is
unfounded: prepaid credits *plus* a subscription is the standard model for
metered infrastructure, and it maps cleanly onto the two audiences.

- **Credits** suit variable, bursty, self-serve usage — a founder validating
  three ideas this month and none next.
- **Subscriptions** suit firms, who need a predictable line item, seats, and
  a budget they can approve once.

Combine them the usual way: **a plan includes an allowance; credits cover
overage and top-ups.**

At $0.18 cost, pricing a validation around **$1** yields roughly **80%
gross margin** — healthy, and it leaves room to be generous where generosity
is cheap.

Three principles that matter more than the exact numbers:

1. **Credits should roll over, not expire.** Expiry earns a little revenue
   and costs a lot of trust — a bad trade for a product whose entire pitch
   is trustworthiness.
2. **Charge for fresh analysis, not for reading.** Re-opening a report,
   exporting the PDF, asking the assistant about an existing report: free.
   They cost almost nothing and drive the habit.
3. **The unit must be legible.** "One validation" is a unit a customer
   understands. Credits should map to it visibly, not obscure it.

## 8. Naming

`BIZVA.io`, `Bizval.io`, `.com` — the instinct to shorten is sound;
"BizValidate" is descriptive but long, and a short mark travels better.

Three things to weigh:

- **`.com` beats `.io` for this buyer.** Selling to investment firms, `.com`
  reads established; `.io` reads developer tool. If the firm segment is the
  business, that difference is worth paying for.
- **Rename now or never.** With two accounts and no brand equity, the cost
  is a domain plus a day of config (Clerk domain, Vercel, R2 CORS, the PDF
  wordmark, copy). After real customers it becomes a migration.
- **It is not the thing that decides success.** Worth an afternoon, not a
  month, and it should not block product work.

Check availability first; the choice is otherwise taste. The product name
should also survive the segments — a firm-facing tool called something
founder-flavoured ages badly.

## 9. What this will never be

Scope discipline, stated so it can be pointed at later.

- **A predictor of success.** It measures how well-evidenced a case is
  against a published rubric. Every surface says so; the disclaimer is the
  last line of every report. Claiming prediction would be both false and
  the fastest way to lose a credible reviewer.
- **An autonomous agent.** The pipeline is six fixed steps in code.
  Determinism is the product; a planning loop would forfeit it.
- **A website builder** (see §6.5).
- **A domain registrar** (see §6.5).
- **A replacement for diligence.** Team, traction and a founder's own
  financials cannot be verified from public sources — the honest ceiling of
  web enrichment. The report says which claims are unverified and what would
  evidence them. Founder-supplied documents are the designed next step; even
  then the tool informs judgement rather than replacing it.

## 10. Decisions that are still open

These need a human call, and they shape everything downstream:

1. **Which segment gets the next three months** — the recommendation above
   is founders for learning, firms for revenue, but the resources are one
   person's time and that must be spent deliberately.
2. **The name and TLD**, before there are customers to migrate.
3. **When multi-tenancy lands.** Every table keys to `user_id` today. The
   trigger should be a firm that has said yes, not a firm that might.
4. **Whether outcomes get captured from day one.** The calibration dataset
   is the long-term moat and it only exists if collection starts early. A
   single follow-up question, months later, is the cheapest version.
5. **Free tier shape** — how much a founder gets before paying, given a
   fresh validation costs ~$0.18 and a re-run is free.

## 11. The nearest horizon

Not a roadmap (that belongs in its own file), but the honest next steps in
order of value per unit of effort:

1. Finish the outstanding end-to-end verification and ship prompt v1.2.
2. Get real founders using it — the segment question is answered with usage
   data, not analysis.
3. Report Q&A, grounded strictly in stored report data.
4. Operator console, and rename the current `/admin`.
5. Credits and billing, once there is something worth metering.
6. Organisations, API and MCP — when a firm has asked and will pay.

The consistent principle: **build the next thing when there is evidence
someone wants it, and keep every number defensible while doing it.**
