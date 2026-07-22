import type {
  CategoryDef,
  ClassifyResult,
  ErrorInput,
  MatchRule,
  Taxonomy,
} from "./types.js";

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeText(value: unknown): string {
  if (value == null) return "";
  return String(value).toLowerCase();
}

function ruleMatches(
  rule: MatchRule,
  error: ErrorInput,
  matchedOn: string[],
): boolean {
  let anyConstraint = false;
  let allOk = true;

  if (rule.status !== undefined) {
    anyConstraint = true;
    const statuses = asArray(rule.status);
    const ok = error.status != null && statuses.includes(error.status);
    if (ok) matchedOn.push(`status:${error.status}`);
    allOk = allOk && ok;
  }

  if (rule.message_contains !== undefined) {
    anyConstraint = true;
    const message = normalizeText(error.message);
    const hit = rule.message_contains.find((p) =>
      message.includes(p.toLowerCase()),
    );
    const ok = Boolean(hit);
    if (ok && hit) matchedOn.push(`message_contains:${hit}`);
    allOk = allOk && ok;
  }

  if (rule.message_regex !== undefined) {
    anyConstraint = true;
    const message = error.message ?? "";
    const re = new RegExp(rule.message_regex, "i");
    const ok = re.test(message);
    if (ok) matchedOn.push(`message_regex:${rule.message_regex}`);
    allOk = allOk && ok;
  }

  if (rule.exception_type !== undefined) {
    anyConstraint = true;
    const types = asArray(rule.exception_type).map((t) => t.toLowerCase());
    const actual = normalizeText(error.exception_type);
    const ok = types.some((t) => actual === t || actual.includes(t));
    if (ok) matchedOn.push(`exception_type:${error.exception_type}`);
    allOk = allOk && ok;
  }

  if (rule.code !== undefined) {
    anyConstraint = true;
    const codes = asArray(rule.code).map((c) => c.toLowerCase());
    const actual = normalizeText(error.code);
    const ok = codes.includes(actual);
    if (ok) matchedOn.push(`code:${error.code}`);
    allOk = allOk && ok;
  }

  if (rule.source !== undefined) {
    anyConstraint = true;
    const sources = asArray(rule.source).map((s) => s.toLowerCase());
    const actual = normalizeText(error.source);
    const ok = sources.includes(actual);
    if (ok) matchedOn.push(`source:${error.source}`);
    allOk = allOk && ok;
  }

  return anyConstraint && allOk;
}

function categoryMatches(
  def: CategoryDef,
  error: ErrorInput,
): { ok: boolean; matchedOn: string[] } {
  const matchedOn: string[] = [];
  for (const rule of def.match ?? []) {
    const local: string[] = [];
    if (ruleMatches(rule, error, local)) {
      return { ok: true, matchedOn: local };
    }
  }
  return { ok: false, matchedOn };
}

/**
 * Classify an error into a taxonomy category.
 * First matching category wins. Order in the taxonomy file matters.
 * Categories named "unknown" are skipped during matching and used as fallback.
 */
export function classify(
  error: ErrorInput,
  taxonomy: Taxonomy,
): ClassifyResult {
  for (const [name, def] of Object.entries(taxonomy.categories)) {
    if (name === "unknown") continue;
    const { ok, matchedOn } = categoryMatches(def, error);
    if (ok) {
      const confidence =
        matchedOn.some((m) => m.startsWith("status:") || m.startsWith("code:"))
          ? "high"
          : matchedOn.some((m) => m.startsWith("exception_type:"))
            ? "high"
            : "medium";
      return {
        category: name,
        confidence,
        matched_on: matchedOn,
        description: def.description,
      };
    }
  }

  return {
    category: "unknown",
    confidence: "low",
    matched_on: [],
    description: taxonomy.categories.unknown?.description ?? "Unrecognized error",
  };
}
