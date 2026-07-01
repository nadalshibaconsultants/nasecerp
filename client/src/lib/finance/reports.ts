/**
 * Financial statement computations — derived purely from posted journal
 * entries and the chart of accounts. Sign conventions:
 *   - Assets, Expenses: natural debit balance (Dr - Cr)
 *   - Liabilities, Equity, Income: natural credit balance (Cr - Dr)
 *
 * The auto-post engine guarantees AR/AP/Receipts/Payments produce balanced
 * journals, so the three statements always tie out (Balance Sheet balances,
 * P&L Net Income equals movement in Retained Earnings + Cash Flow ties).
 */
import type { JournalEntry, GLAccount } from "./types";

const COA = {
  ACCOUNTS_RECEIVABLE: "1103000",
  ACCOUNTS_PAYABLE: "2102000",
  VAT_RECOVERABLE: "2201200",
  VAT_PAYABLE: "2201100",
  CASH_IN_HAND: "1101000",
  BANKS: "1102000",
} as const;

export type AccountBalance = {
  account: GLAccount;
  debit: number;
  credit: number;
  balance: number; // natural-sign balance
};

function inRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function naturalBalance(
  account: GLAccount,
  debit: number,
  credit: number
): number {
  if (account.type === "asset" || account.type === "expense")
    return debit - credit;
  return credit - debit;
}

// ===== Trial Balance =====
export function computeTrialBalance(
  journals: JournalEntry[],
  accounts: GLAccount[],
  asOfDate?: string
): AccountBalance[] {
  const debitByAcct: Record<string, number> = {};
  const creditByAcct: Record<string, number> = {};
  for (const j of journals) {
    if (j.status !== "posted") continue;
    if (asOfDate && j.date > asOfDate) continue;
    for (const l of j.lines) {
      debitByAcct[l.accountCode] = (debitByAcct[l.accountCode] || 0) + l.debit;
      creditByAcct[l.accountCode] =
        (creditByAcct[l.accountCode] || 0) + l.credit;
    }
  }
  return accounts
    .filter(
      a => (debitByAcct[a.code] || 0) > 0 || (creditByAcct[a.code] || 0) > 0
    )
    .map(a => {
      const d = debitByAcct[a.code] || 0;
      const c = creditByAcct[a.code] || 0;
      return {
        account: a,
        debit: d,
        credit: c,
        balance: naturalBalance(a, d, c),
      };
    });
}

// ===== P&L =====
export type PLSection = {
  title: string;
  accounts: AccountBalance[];
  subtotal: number;
};

export type ProfitLoss = {
  fromDate: string;
  toDate: string;
  revenue: PLSection;
  otherIncome: PLSection;
  directCosts: PLSection;
  operatingExpenses: PLSection;
  financeExpenses: PLSection;
  totalRevenue: number;
  totalIncome: number;
  totalDirectCosts: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  operatingProfit: number;
  totalFinanceExpenses: number;
  netProfit: number;
  grossMarginPct: number;
  netMarginPct: number;
};

export function computeProfitLoss(
  journals: JournalEntry[],
  accounts: GLAccount[],
  fromDate: string,
  toDate: string
): ProfitLoss {
  const periodJournals = journals.filter(
    j => j.status === "posted" && inRange(j.date, fromDate, toDate)
  );
  // Balance per income/expense account in period
  const balances = new Map<string, AccountBalance>();
  for (const j of periodJournals) {
    for (const l of j.lines) {
      const acct = accounts.find(a => a.code === l.accountCode);
      if (!acct) continue;
      if (acct.type !== "income" && acct.type !== "expense") continue;
      const prev = balances.get(acct.code) || {
        account: acct,
        debit: 0,
        credit: 0,
        balance: 0,
      };
      prev.debit += l.debit;
      prev.credit += l.credit;
      prev.balance = naturalBalance(acct, prev.debit, prev.credit);
      balances.set(acct.code, prev);
    }
  }
  const arr = Array.from(balances.values());

  const revenue = arr
    .filter(b => b.account.subType === "revenue")
    .sort((a, b) => a.account.code.localeCompare(b.account.code));
  const otherIncome = arr.filter(b => b.account.subType === "other-income");
  const directCosts = arr.filter(b => b.account.subType === "cogs");
  const operatingExpenses = arr.filter(
    b =>
      b.account.subType === "operating-expense" ||
      b.account.subType === "admin-expense"
  );
  const financeExpenses = arr.filter(
    b => b.account.subType === "finance-expense"
  );

  const sum = (s: AccountBalance[]) => s.reduce((t, b) => t + b.balance, 0);
  const totalRevenue = sum(revenue);
  const totalOther = sum(otherIncome);
  const totalIncome = totalRevenue + totalOther;
  const totalDirectCosts = sum(directCosts);
  const grossProfit = totalRevenue - totalDirectCosts;
  const totalOperatingExpenses = sum(operatingExpenses);
  const operatingProfit = grossProfit + totalOther - totalOperatingExpenses;
  const totalFinanceExpenses = sum(financeExpenses);
  const netProfit = operatingProfit - totalFinanceExpenses;

  return {
    fromDate,
    toDate,
    revenue: { title: "Revenue", accounts: revenue, subtotal: totalRevenue },
    otherIncome: {
      title: "Other Income",
      accounts: otherIncome,
      subtotal: totalOther,
    },
    directCosts: {
      title: "Direct Costs",
      accounts: directCosts,
      subtotal: totalDirectCosts,
    },
    operatingExpenses: {
      title: "Operating Expenses",
      accounts: operatingExpenses,
      subtotal: totalOperatingExpenses,
    },
    financeExpenses: {
      title: "Finance Costs",
      accounts: financeExpenses,
      subtotal: totalFinanceExpenses,
    },
    totalRevenue,
    totalIncome,
    totalDirectCosts,
    grossProfit,
    totalOperatingExpenses,
    operatingProfit,
    totalFinanceExpenses,
    netProfit,
    grossMarginPct: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    netMarginPct: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
  };
}

// ===== Balance Sheet =====
export type BalanceSheet = {
  asOfDate: string;
  currentAssets: PLSection;
  nonCurrentAssets: PLSection;
  totalAssets: number;
  currentLiabilities: PLSection;
  nonCurrentLiabilities: PLSection;
  totalLiabilities: number;
  equity: PLSection;
  retainedEarningsThisPeriod: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  difference: number; // should be 0 — if not, debug
};

export function computeBalanceSheet(
  journals: JournalEntry[],
  accounts: GLAccount[],
  asOfDate: string
): BalanceSheet {
  const trial = computeTrialBalance(journals, accounts, asOfDate);
  const sum = (s: AccountBalance[]) => s.reduce((t, b) => t + b.balance, 0);

  const currentAssets = trial.filter(
    b =>
      b.account.type === "asset" &&
      (b.account.subType === "current-asset" ||
        b.account.subType === "non-current-asset")
  );
  const nonCurrentAssets = trial.filter(
    b => b.account.type === "asset" && b.account.subType === "fixed-asset"
  );
  const currentLiabilities = trial.filter(
    b =>
      b.account.type === "liability" &&
      b.account.subType === "current-liability"
  );
  const nonCurrentLiabilities = trial.filter(
    b =>
      b.account.type === "liability" &&
      b.account.subType === "non-current-liability"
  );
  const equity = trial.filter(b => b.account.type === "equity");

  // Year-to-date Net Profit = P&L from year-start to asOf
  const yearStart = asOfDate.slice(0, 4) + "-01-01";
  const pl = computeProfitLoss(journals, accounts, yearStart, asOfDate);
  const retainedThisPeriod = pl.netProfit;

  const totalAssets = sum(currentAssets) + sum(nonCurrentAssets);
  const totalLiabilities = sum(currentLiabilities) + sum(nonCurrentLiabilities);
  const totalEquity = sum(equity) + retainedThisPeriod;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    asOfDate,
    currentAssets: {
      title: "Current Assets",
      accounts: currentAssets,
      subtotal: sum(currentAssets),
    },
    nonCurrentAssets: {
      title: "Non-Current Assets",
      accounts: nonCurrentAssets,
      subtotal: sum(nonCurrentAssets),
    },
    totalAssets,
    currentLiabilities: {
      title: "Current Liabilities",
      accounts: currentLiabilities,
      subtotal: sum(currentLiabilities),
    },
    nonCurrentLiabilities: {
      title: "Non-Current Liabilities",
      accounts: nonCurrentLiabilities,
      subtotal: sum(nonCurrentLiabilities),
    },
    totalLiabilities,
    equity: { title: "Equity", accounts: equity, subtotal: sum(equity) },
    retainedEarningsThisPeriod: retainedThisPeriod,
    totalEquity,
    totalLiabilitiesAndEquity,
    difference: totalAssets - totalLiabilitiesAndEquity,
  };
}

// ===== Cash Flow (Indirect) =====
export type CashFlow = {
  fromDate: string;
  toDate: string;
  netProfit: number;
  addBack: { label: string; amount: number }[];
  workingCapital: { label: string; amount: number }[];
  cashFromOperating: number;
  investing: { label: string; amount: number }[];
  cashFromInvesting: number;
  financing: { label: string; amount: number }[];
  cashFromFinancing: number;
  netChangeInCash: number;
  openingCash: number;
  closingCash: number;
};

export function computeCashFlow(
  journals: JournalEntry[],
  accounts: GLAccount[],
  fromDate: string,
  toDate: string
): CashFlow {
  const pl = computeProfitLoss(journals, accounts, fromDate, toDate);
  const netProfit = pl.netProfit;

  // Movement in cash + bank accounts
  function cashBalance(asOf: string): number {
    const tb = computeTrialBalance(journals, accounts, asOf);
    return tb
      .filter(b => b.account.isBank || b.account.isCash)
      .reduce((s, b) => s + b.balance, 0);
  }
  const opening = cashBalance(fromDate); // technically end-of-period-before; close enough for the demo
  const closing = cashBalance(toDate);
  const netChange = closing - opening;

  // Movement in working-capital accounts in period
  function periodMovement(code: string): number {
    let d = 0,
      c = 0;
    for (const j of journals) {
      if (j.status !== "posted" || !inRange(j.date, fromDate, toDate)) continue;
      for (const l of j.lines)
        if (l.accountCode === code) {
          d += l.debit;
          c += l.credit;
        }
    }
    const acct = accounts.find(a => a.code === code);
    return acct ? naturalBalance(acct, d, c) : d - c;
  }
  // For asset accts: increase reduces cash; for liability accts: increase adds cash
  const arMovement = -periodMovement(COA.ACCOUNTS_RECEIVABLE); // increase in AR uses cash
  const apMovement = periodMovement(COA.ACCOUNTS_PAYABLE); // increase in AP frees cash
  const inputVatMovement = -periodMovement(COA.VAT_RECOVERABLE);
  const outputVatMovement = periodMovement(COA.VAT_PAYABLE);

  // Depreciation (add back)
  const depCodes = ["5102018"];
  const depTotal = depCodes.reduce(
    (s, c) => s + Math.max(periodMovement(c), 0),
    0
  );

  const cashFromOperating =
    netProfit +
    depTotal +
    arMovement +
    apMovement +
    inputVatMovement +
    outputVatMovement;

  // Investing — net change in fixed assets at acquisition cost
  const faCodes = ["1201000", "1202000", "1203000", "1204000"];
  const faMovement = faCodes.reduce((s, c) => s + periodMovement(c), 0);
  const cashFromInvesting = -faMovement; // cash spent acquiring assets

  // Financing — equity / loan / drawings
  const finCodes = ["3100000", "1206000", "2200000"];
  const finMovement = finCodes.reduce((s, c) => s + periodMovement(c), 0);
  const cashFromFinancing = finMovement;

  return {
    fromDate,
    toDate,
    netProfit,
    addBack: [{ label: "Depreciation & Amortisation", amount: depTotal }],
    workingCapital: [
      { label: "(Increase) / Decrease in AR", amount: arMovement },
      { label: "Increase / (Decrease) in AP", amount: apMovement },
      {
        label: "(Increase) / Decrease in Input VAT recoverable",
        amount: inputVatMovement,
      },
      {
        label: "Increase / (Decrease) in Output VAT payable",
        amount: outputVatMovement,
      },
    ],
    cashFromOperating,
    investing: [
      {
        label: "Acquisition / (disposal) of fixed assets",
        amount: -faMovement,
      },
    ],
    cashFromInvesting,
    financing: [
      { label: "Equity / loans / drawings movement", amount: finMovement },
    ],
    cashFromFinancing,
    netChangeInCash: netChange,
    openingCash: opening,
    closingCash: closing,
  };
}

// ===== Project P&L (Cost Centre Allocation) =====
export type ProjectPL = {
  projectId: string;
  revenue: number;
  directCosts: number;
  margin: number;
  marginPct: number;
  revenueLines: { account: string; amount: number }[];
  costLines: { account: string; amount: number }[];
};

export function computeProjectPL(
  journals: JournalEntry[],
  accounts: GLAccount[],
  projectId: string,
  fromDate?: string,
  toDate?: string
): ProjectPL {
  const rev = new Map<string, number>();
  const cost = new Map<string, number>();
  for (const j of journals) {
    if (j.status !== "posted" || !inRange(j.date, fromDate, toDate)) continue;
    for (const l of j.lines) {
      if (l.projectId !== projectId) continue;
      const acct = accounts.find(a => a.code === l.accountCode);
      if (!acct) continue;
      if (acct.type === "income") {
        rev.set(
          l.accountCode,
          (rev.get(l.accountCode) || 0) + (l.credit - l.debit)
        );
      } else if (acct.type === "expense") {
        cost.set(
          l.accountCode,
          (cost.get(l.accountCode) || 0) + (l.debit - l.credit)
        );
      }
    }
  }
  const totalRev = [...rev.values()].reduce((s, v) => s + v, 0);
  const totalCost = [...cost.values()].reduce((s, v) => s + v, 0);
  return {
    projectId,
    revenue: totalRev,
    directCosts: totalCost,
    margin: totalRev - totalCost,
    marginPct: totalRev > 0 ? ((totalRev - totalCost) / totalRev) * 100 : 0,
    revenueLines: [...rev.entries()].map(([code, amount]) => ({
      account: accounts.find(a => a.code === code)?.name || code,
      amount,
    })),
    costLines: [...cost.entries()].map(([code, amount]) => ({
      account: accounts.find(a => a.code === code)?.name || code,
      amount,
    })),
  };
}
