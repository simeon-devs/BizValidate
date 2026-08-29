// Maps the free-text region a founder enters (or the extractor infers) to
// the nation name Tavily's `country` parameter expects, so market research
// is boosted toward the right country. Anything that is not clearly one
// nation — "West Africa", "Europe", "not stated" — resolves to null, and the
// search runs without a boost rather than with a wrong one.

const COUNTRIES = [
  "algeria", "angola", "benin", "botswana", "burkina faso", "burundi",
  "cameroon", "cape verde", "central african republic", "chad", "comoros",
  "congo", "democratic republic of the congo", "djibouti", "egypt",
  "equatorial guinea", "eritrea", "eswatini", "ethiopia", "gabon", "gambia",
  "ghana", "guinea", "guinea-bissau", "ivory coast", "kenya", "lesotho",
  "liberia", "libya", "madagascar", "malawi", "mali", "mauritania",
  "mauritius", "morocco", "mozambique", "namibia", "niger", "nigeria",
  "rwanda", "sao tome and principe", "senegal", "seychelles", "sierra leone",
  "somalia", "south africa", "south sudan", "sudan", "tanzania", "togo",
  "tunisia", "uganda", "zambia", "zimbabwe",
  "united states", "canada", "mexico", "brazil", "argentina", "chile",
  "colombia", "peru", "united kingdom", "ireland", "france", "germany",
  "spain", "portugal", "italy", "netherlands", "belgium", "switzerland",
  "austria", "sweden", "norway", "denmark", "finland", "poland", "turkey",
  "united arab emirates", "saudi arabia", "qatar", "israel", "india",
  "pakistan", "bangladesh", "sri lanka", "china", "japan", "south korea",
  "singapore", "malaysia", "indonesia", "philippines", "vietnam", "thailand",
  "australia", "new zealand",
] as const;

const ALIASES: Record<string, string> = {
  "cote d'ivoire": "ivory coast",
  "cote divoire": "ivory coast",
  "côte d'ivoire": "ivory coast",
  drc: "democratic republic of the congo",
  "dr congo": "democratic republic of the congo",
  "congo-kinshasa": "democratic republic of the congo",
  "congo kinshasa": "democratic republic of the congo",
  "republic of the congo": "congo",
  "congo-brazzaville": "congo",
  swaziland: "eswatini",
  "the gambia": "gambia",
  usa: "united states",
  us: "united states",
  "united states of america": "united states",
  uk: "united kingdom",
  britain: "united kingdom",
  "great britain": "united kingdom",
  england: "united kingdom",
  uae: "united arab emirates",
  holland: "netherlands",
  "south korea": "south korea",
  korea: "south korea",
};

const KNOWN = new Set<string>(COUNTRIES);

function clean(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveToken(token: string): string | null {
  const t = clean(token).replace(/^(the )/, "");
  if (!t) return null;
  if (KNOWN.has(t)) return t;
  const alias = ALIASES[t];
  return alias ?? null;
}

// "Uganda" → "uganda"; "Kigali, Rwanda" → "rwanda"; "West Africa" → null.
export function countryForRegion(region: string | undefined | null): string | null {
  if (!region) return null;
  const whole = resolveToken(region);
  if (whole) return whole;
  // Try the parts of "City, Country" or "Country / Region"; take the last
  // token that resolves, which is where the country usually sits.
  const parts = region.split(/[,/;|]|\band\b|\s-\s|\s–\s/).map((p) => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const hit = resolveToken(parts[i]);
    if (hit) return hit;
  }
  return null;
}
