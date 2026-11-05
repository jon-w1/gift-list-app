/** Birthdays are stored as plain dates ("YYYY-MM-DD"); all maths here is calendar-only (UTC). */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Form value → "YYYY-MM-DD" or null (empty/invalid clears it). */
export function parseBirthday(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1 || +m[1] < 1900 || d.getTime() > Date.now() + 86_400_000) return null;
  return s;
}

/** "March 4", days until the next one (0 = today), and the age they turn then. */
export function describeBirthday(date: string, now = new Date()) {
  const [y, m, d] = date.split("-").map(Number);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let year = now.getUTCFullYear();
  // Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
  const at = (yr: number) => {
    const leap = (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
    return Date.UTC(yr, m - 1, m === 2 && d === 29 && !leap ? 28 : d);
  };
  if (at(year) < today) year += 1;
  return {
    label: `${MONTHS[m - 1]} ${d}`,
    short: `${MONTHS[m - 1].slice(0, 3)} ${d}`,
    inDays: Math.round((at(year) - today) / 86_400_000),
    turns: year - y,
  };
}

/** One-line summary, e.g. "Birthday March 4 · in 23 days" or "Birthday today! Turns 8". */
export function birthdayLine(date: string, showAge: boolean) {
  const b = describeBirthday(date);
  const when = b.inDays === 0 ? "today! 🎉" : b.inDays === 1 ? "tomorrow" : b.inDays <= 60 ? `in ${b.inDays} days` : null;
  const age = showAge && b.turns > 0 ? `turns ${b.turns}` : null;
  if (b.inDays === 0) return `Birthday today! 🎉${age ? ` ${age[0].toUpperCase()}${age.slice(1)}` : ""}`;
  return [`Birthday ${b.label}`, when, age].filter(Boolean).join(" · ");
}
