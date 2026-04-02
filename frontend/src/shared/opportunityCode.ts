const OPPORTUNITY_CODE_PREFIX = "OPP-";

export function parseOpportunityCodeSequence(code?: string): number {
  if (!code) return 0;
  const match = code.match(/(\d+)$/);
  if (!match) return 0;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 0;
}

export function formatOpportunityCode(sequence: number): string {
  return `${OPPORTUNITY_CODE_PREFIX}${String(sequence).padStart(6, "0")}`;
}

export function getNextOpportunityCode(codes: Array<string | undefined>): string {
  const maxSequence = codes.reduce((max, code) => {
    const value = parseOpportunityCodeSequence(code);
    return value > max ? value : max;
  }, 0);
  return formatOpportunityCode(maxSequence + 1);
}
