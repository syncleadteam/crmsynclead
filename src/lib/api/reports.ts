export function parsePeriod(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? 30);
  const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 365) : 30;
  const since = new Date();
  since.setDate(since.getDate() - safeDays);

  return {
    days: safeDays,
    sinceIso: since.toISOString(),
    sinceDate: since.toISOString().slice(0, 10),
  };
}

export function monthKey(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return value.slice(0, 7);
}
