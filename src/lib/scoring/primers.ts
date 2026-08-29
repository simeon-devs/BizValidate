import type { MetricId } from "@/types/report";

// Plain-language primers for the eight metrics: what each one measures, why
// an investor cares, and the terms a reader may want to look up. Written
// once, by hand, and identical on every report — so a reader who is not from
// the domain can follow the analysis, and one who is finds nothing to argue
// with. Nothing here is generated or business-specific.

export interface PrimerTerm {
  term: string;
  definition: string;
}

export interface MetricPrimer {
  what: string; // one sentence — shown under the metric title
  why: string; // why this matters to an investor
  terms: PrimerTerm[];
}

export const PRIMERS: Record<MetricId, MetricPrimer> = {
  team: {
    what: "Who is building this, and whether their experience matches what the business actually needs.",
    why: "At an early stage there is little else to judge. Investors back people before products, and most execution risk sits with the founders: the right team can fix a weak plan, but a strong plan rarely survives the wrong team.",
    terms: [
      { term: "Founder–market fit", definition: "Whether the founders' background gives them an unfair advantage in this particular market, such as years inside the industry or direct experience of the problem." },
      { term: "Key-person risk", definition: "How badly the business would be hurt if one individual left or became unavailable — common when a single person holds all the technical or commercial knowledge." },
      { term: "Advisory board", definition: "Experienced outsiders who guide the founders without running the company day to day. Their absence is a gap; their presence is a signal that others have vetted the idea." },
      { term: "Vesting", definition: "Founders earning their shares over time rather than owning them outright from day one, so someone who leaves early does not keep a large stake." },
    ],
  },
  market: {
    what: "How large the opportunity is, whether it is growing, and whether now is the right time.",
    why: "A great team in a small or shrinking market has a ceiling on what it can ever return. Market size sets the upper bound on the outcome; growth and timing decide whether the business can reach it.",
    terms: [
      { term: "TAM / SAM / SOM", definition: "Three nested sizes: the total market for the category (TAM), the part this business could realistically serve (SAM), and the share it can plausibly win in the near term (SOM)." },
      { term: "CAGR", definition: "Compound annual growth rate — how fast a market grows per year on average. A market growing at 10% CAGR doubles in about seven years." },
      { term: "Market timing", definition: "Whether a change in technology, regulation or behaviour makes the opportunity possible now when it was not before. 'Why now?' is the investor's question." },
      { term: "Bottom-up sizing", definition: "Estimating the market from the ground up — number of customers times what each would pay — rather than quoting a large headline figure from a report." },
    ],
  },
  product: {
    what: "Whether the product exists, works, and does something competitors cannot easily copy.",
    why: "A working product with a real edge is what turns a market opportunity into a business. An idea, a prototype and a product in customers' hands are three very different levels of risk.",
    terms: [
      { term: "MVP", definition: "Minimum viable product — the simplest version that real customers can use, built to test whether they want it before more is invested." },
      { term: "Product–market fit", definition: "The point at which customers pull the product from the company rather than the company pushing it: repeat use, referrals, and demand the team struggles to keep up with." },
      { term: "Technical moat", definition: "Something in how the product is built that a competitor cannot quickly replicate — proprietary data, a hard engineering problem solved, or deep integration into how customers work." },
      { term: "IP", definition: "Intellectual property — patents, trade secrets, or exclusive rights that legally stop others from copying the product." },
    ],
  },
  competitive: {
    what: "Who else serves these customers, how this business differs, and what stops others from copying it.",
    why: "Claiming 'no competition' usually means the market is too small or the founder has not looked. A clearly stated position, and something that protects it, is what keeps margins intact when competitors arrive.",
    terms: [
      { term: "Moat", definition: "A durable advantage that protects the business from competitors over time — brand, network effects, cost advantage, switching costs or regulation." },
      { term: "Switching costs", definition: "What a customer would have to give up, pay or relearn to move to a competitor. High switching costs keep customers even when a rival is slightly better or cheaper." },
      { term: "Differentiation", definition: "The specific, provable ways the offer is different from the alternatives a customer actually considers — including informal ones like doing it themselves." },
      { term: "Barriers to entry", definition: "What makes it hard for a new competitor to start: capital, licences, relationships, data or expertise that take years to build." },
    ],
  },
  gotomarket: {
    what: "How the business finds and wins customers, through which channels, and what each one costs.",
    why: "Many good products fail on distribution, not quality. A repeatable, affordable way to acquire customers is what makes growth predictable rather than hoped for.",
    terms: [
      { term: "CAC", definition: "Customer acquisition cost — the total spent on sales and marketing to win one paying customer, including people's time." },
      { term: "LTV", definition: "Lifetime value — the profit a typical customer generates over the whole time they stay. Healthy businesses earn several times their CAC back in LTV." },
      { term: "Channel", definition: "A route to customers: direct sales, partners, marketplaces, referrals, paid advertising. Each has its own cost and speed." },
      { term: "Payback period", definition: "How long it takes to earn back the cost of acquiring a customer. Shorter payback means growth needs less outside cash." },
    ],
  },
  financials: {
    what: "How the business makes money, what one unit of it costs and earns, and whether the numbers add up to a profitable company.",
    why: "Revenue on its own says little. A business can grow revenue while losing more money on every sale; unit economics show whether growth creates value or destroys it.",
    terms: [
      { term: "Gross margin", definition: "Revenue minus the direct cost of delivering the product or service, as a percentage of revenue. It is what is left to pay for everything else." },
      { term: "Unit economics", definition: "The revenue and cost of a single unit — one delivery, one subscription, one tonne processed — showing whether each sale is profitable before overheads." },
      { term: "Burn rate", definition: "How much cash the business loses each month. Combined with cash in the bank it gives runway." },
      { term: "Runway", definition: "How many months the business can operate before it runs out of money at the current burn rate." },
      { term: "Break-even", definition: "The level of sales at which the business covers all its costs and stops losing money." },
    ],
  },
  traction: {
    what: "Evidence that customers actually want this — users, revenue, retention and growth, with numbers.",
    why: "Traction is the one metric that cannot be argued with. It replaces the founder's opinion and the investor's opinion with what customers have already done.",
    terms: [
      { term: "MRR / ARR", definition: "Monthly or annual recurring revenue — the predictable revenue from subscriptions or repeat contracts, excluding one-off sales." },
      { term: "Retention / churn", definition: "Retention is the share of customers who keep buying over time; churn is the share who stop. Growth with high churn is a leaking bucket." },
      { term: "Month-on-month growth", definition: "How much a key number grew compared with the previous month, as a percentage. Consistent growth matters more than one good month." },
      { term: "LOI", definition: "Letter of intent — a written but non-binding statement from a customer that they intend to buy. Weaker than revenue, stronger than a conversation." },
    ],
  },
  scalability: {
    what: "Whether the business can grow without its costs growing at the same rate, and how far it can expand.",
    why: "Venture-scale returns come from businesses whose next customer costs less to serve than the last. A business that must rebuild everything in each new city can be a fine business, but it scales differently and needs different capital.",
    terms: [
      { term: "Marginal cost", definition: "The cost of serving one additional customer. Software approaches zero; a business that needs a truck and a warehouse per region does not." },
      { term: "Network effects", definition: "When each new user makes the product more valuable to every other user — a marketplace with more buyers attracts more sellers, and so on." },
      { term: "Operating leverage", definition: "How much profit grows when revenue grows. High fixed costs and low variable costs mean small revenue gains produce large profit gains." },
      { term: "Replication vs leverage", definition: "Growing by copying the same setup in each new place (replication) versus growing because existing assets serve more customers at little extra cost (leverage)." },
    ],
  },
};
