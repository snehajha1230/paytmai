import { connectMongo } from "@/lib/mongodb";
import type { PatiAeBudgetDto } from "@/lib/pati-ae-budget-types";
import { computePatiAeCategoryAmounts } from "@/lib/pati-ae-budget-amounts";
import { User } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/session-user";

export const runtime = "nodejs";

function parsePeriodAnchorDate(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(y, mo - 1, da);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo - 1 ||
    d.getDate() !== da
  ) {
    return null;
  }
  return t;
}

function mapToRecord(m: unknown): Record<string, number> {
  if (!m || typeof m !== "object") return {};
  const out: Record<string, number> = {};
  if (m instanceof Map) {
    m.forEach((v, k) => {
      const n = typeof v === "number" ? v : Number(v);
      if (typeof k === "string" && Number.isFinite(n)) out[k] = n;
    });
    return out;
  }
  for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function leanBudget(
  raw: unknown,
): PatiAeBudgetDto | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as {
    monthlyIncome?: unknown;
    monthlySave?: unknown;
    categoryPercents?: unknown;
    categoryAmounts?: unknown;
    budgetDays?: unknown;
    periodAnchorDate?: unknown;
  };
  const inc = typeof b.monthlyIncome === "number" ? b.monthlyIncome : Number(b.monthlyIncome);
  const sav = typeof b.monthlySave === "number" ? b.monthlySave : Number(b.monthlySave);
  const days =
    typeof b.budgetDays === "number" ? b.budgetDays : Number(b.budgetDays);
  if (!Number.isFinite(inc) || !Number.isFinite(sav) || !Number.isFinite(days)) {
    return null;
  }
  const perc = mapToRecord(b.categoryPercents);
  const budgetDays = Math.round(days);
  let amounts = mapToRecord(b.categoryAmounts);
  const sumAmt = Object.values(amounts).reduce((s, v) => s + v, 0);
  if (Object.keys(amounts).length === 0 || !Number.isFinite(sumAmt)) {
    amounts = computePatiAeCategoryAmounts(inc, sav, budgetDays, perc);
  }
  const anchor =
    typeof b.periodAnchorDate === "string" && b.periodAnchorDate.trim()
      ? parsePeriodAnchorDate(b.periodAnchorDate)
      : null;

  const dto: PatiAeBudgetDto = {
    monthlyIncome: inc,
    monthlySave: sav,
    categoryPercents: perc,
    categoryAmounts: amounts,
    budgetDays,
  };
  if (anchor) dto.periodAnchorDate = anchor;
  return dto;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();

  const u = await User.findById(user.id).select("patiAeBudget").lean().exec();
  const budget = leanBudget(
    (u as { patiAeBudget?: unknown } | null)?.patiAeBudget,
  );

  return Response.json({ budget });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const monthlyIncome =
    typeof o.monthlyIncome === "number" ? o.monthlyIncome : Number(o.monthlyIncome);
  const monthlySave =
    typeof o.monthlySave === "number" ? o.monthlySave : Number(o.monthlySave);
  const budgetDaysRaw =
    typeof o.budgetDays === "number" ? o.budgetDays : Number(o.budgetDays);

  if (
    !Number.isFinite(monthlyIncome) ||
    monthlyIncome < 0 ||
    !Number.isFinite(monthlySave) ||
    monthlySave < 0
  ) {
    return Response.json(
      { error: "Income and savings must be valid non-negative numbers" },
      { status: 400 },
    );
  }

  if (monthlySave >= monthlyIncome) {
    return Response.json(
      { error: "Amount to save must be less than monthly income" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(budgetDaysRaw) || budgetDaysRaw < 1 || budgetDaysRaw > 31) {
    return Response.json(
      { error: "Budget days must be between 1 and 31" },
      { status: 400 },
    );
  }

  const budgetDays = Math.round(budgetDaysRaw);

  const periodAnchorDate = parsePeriodAnchorDate(o.periodAnchorDate);
  if (!periodAnchorDate) {
    return Response.json(
      { error: "periodAnchorDate must be a valid local date (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const cpRaw = o.categoryPercents;
  if (!cpRaw || typeof cpRaw !== "object" || Array.isArray(cpRaw)) {
    return Response.json(
      { error: "categoryPercents must be an object" },
      { status: 400 },
    );
  }

  const categoryPercents: Record<string, number> = {};
  for (const [k, v] of Object.entries(cpRaw)) {
    if (typeof k !== "string" || !k.trim()) continue;
    const raw = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
      return Response.json(
        { error: `Invalid percent for "${k}"` },
        { status: 400 },
      );
    }
    const n = Math.round(raw);
    if (Math.abs(raw - n) > 1e-9) {
      return Response.json(
        { error: `Percents must be whole numbers (invalid: "${k}")` },
        { status: 400 },
      );
    }
    categoryPercents[k.trim()] = n;
  }

  const keys = Object.keys(categoryPercents);
  if (keys.length === 0) {
    return Response.json(
      { error: "Add at least one category with a percent" },
      { status: 400 },
    );
  }

  const sum = keys.reduce((s, k) => s + categoryPercents[k], 0);
  if (sum !== 100) {
    return Response.json(
      { error: "Category percents must add up to exactly 100%" },
      { status: 400 },
    );
  }

  const categoryAmounts = computePatiAeCategoryAmounts(
    monthlyIncome,
    monthlySave,
    budgetDays,
    categoryPercents,
  );

  await connectMongo();

  await User.findByIdAndUpdate(user.id, {
    $set: {
      patiAeBudget: {
        monthlyIncome,
        monthlySave,
        categoryPercents: new Map(Object.entries(categoryPercents)),
        categoryAmounts: new Map(Object.entries(categoryAmounts)),
        budgetDays,
        periodAnchorDate,
      },
    },
  }).exec();

  const dto: PatiAeBudgetDto = {
    monthlyIncome,
    monthlySave,
    categoryPercents,
    categoryAmounts,
    budgetDays,
    periodAnchorDate,
  };

  return Response.json({ budget: dto });
}
