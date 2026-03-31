export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Compare last 10 digits (India mobile). */
export function phonesMatch(a: string, b: string | null | undefined): boolean {
  if (!b) return false;
  const la = digitsOnly(a);
  const lb = digitsOnly(b);
  const ta = la.length >= 10 ? la.slice(-10) : la;
  const tb = lb.length >= 10 ? lb.slice(-10) : lb;
  return ta.length >= 10 && tb.length >= 10 && ta === tb;
}

export function formatInPhoneDisplay(raw: string): string {
  const d = digitsOnly(raw);
  const ten = d.length >= 10 ? d.slice(-10) : d;
  if (ten.length <= 5) return ten;
  return `${ten.slice(0, 5)} ${ten.slice(5)}`;
}
