export interface LoanTier {
  principal: number;
  fee: number;
  packageId: string;
}

export interface LoanPackage {
  id: string;
  name: string;
  audience: string;
  minAmount: number;
  maxAmount: number;
  supportedTerms: number[]; // in months
  gracePeriodDays: number;
  disbursementSpeed: string;
  recommended?: boolean;
  summary: string;
  tiers: LoanTier[];
}

export interface ExtensionOption {
  days: number;
  feePercent: number;
  label: string;
  note: string;
}

export interface LoanCalculation {
  amount: number;
  feeAmount: number;
  effectiveFeePercent: number;
  totalRepayment: number;
  termMonths: number;
  matchedPackage: LoanPackage;
  monthlyInstallment: number;
  dueDateFormatted: string;
}

export interface ApplicantProfile {
  fullName: string;
  nationalId: string;
  phone: string;
}

export type DrawerIntent =
  | { type: 'loan'; calculation: LoanCalculation }
  | { type: 'extension'; balance: number; option: ExtensionOption; extensionFee: number }
  | { type: 'referral'; bonusAmount: number; friendCount: number };

export const LOAN_TIERS: LoanTier[] = [
  { principal: 10000, fee: 99, packageId: 'starter-flex' },
  { principal: 15000, fee: 149, packageId: 'starter-flex' },
  { principal: 21000, fee: 199, packageId: 'starter-flex' },
  { principal: 30000, fee: 349, packageId: 'growth-plus' },
  { principal: 45000, fee: 549, packageId: 'growth-plus' },
  { principal: 60000, fee: 899, packageId: 'growth-plus' },
  { principal: 80000, fee: 1299, packageId: 'biashara-pro' },
  { principal: 100000, fee: 1699, packageId: 'biashara-pro' },
  { principal: 125000, fee: 2199, packageId: 'biashara-pro' },
  { principal: 150000, fee: 2799, packageId: 'zenka-prime' },
  { principal: 175000, fee: 3399, packageId: 'zenka-prime' },
  { principal: 200000, fee: 3999, packageId: 'zenka-prime' },
];

export const LOAN_PACKAGES: LoanPackage[] = [
  {
    id: 'starter-flex',
    name: 'Starter Flex',
    audience: 'For first-time borrowers and everyday needs',
    minAmount: 10000,
    maxAmount: 21000,
    supportedTerms: [6, 12],
    gracePeriodDays: 7,
    disbursementSpeed: 'Instant via M-Pesa',
    summary: 'Accessible entry tiers with fixed facilitation fees starting at KSh 99 and 6–12 month plans.',
    tiers: LOAN_TIERS.filter((t) => t.packageId === 'starter-flex'),
  },
  {
    id: 'growth-plus',
    name: 'Growth Plus',
    audience: 'For repeat borrowers and household liquidity',
    minAmount: 30000,
    maxAmount: 60000,
    supportedTerms: [6, 12, 24],
    gracePeriodDays: 10,
    disbursementSpeed: 'Instant via M-Pesa',
    recommended: true,
    summary: 'Our best value mid-tier credit with up to 2 years repayment and a 10-day grace window.',
    tiers: LOAN_TIERS.filter((t) => t.packageId === 'growth-plus'),
  },
  {
    id: 'biashara-pro',
    name: 'Biashara Pro',
    audience: 'For SME stock restocks and working capital',
    minAmount: 80000,
    maxAmount: 125000,
    supportedTerms: [12, 24],
    gracePeriodDays: 14,
    disbursementSpeed: 'Under 3 minutes',
    summary: 'Structured working capital for merchants scaling inventory over 12 to 24 months.',
    tiers: LOAN_TIERS.filter((t) => t.packageId === 'biashara-pro'),
  },
  {
    id: 'zenka-prime',
    name: 'Zenka Prime',
    audience: 'For verified loyal members up to KSh 200,000',
    minAmount: 150000,
    maxAmount: 200000,
    supportedTerms: [12, 24],
    gracePeriodDays: 14,
    disbursementSpeed: 'Priority M-Pesa',
    summary: 'High-limit 2-year credit up to KSh 200,000 with a 14-day grace window and priority settlement.',
    tiers: LOAN_TIERS.filter((t) => t.packageId === 'zenka-prime'),
  },
];

export const EXTENSION_OPTIONS: ExtensionOption[] = [
  { days: 7, feePercent: 1.5, label: '7 Days', note: 'Short bridge window' },
  { days: 14, feePercent: 2.5, label: '14 Days', note: 'Two-week breathing room' },
  { days: 30, feePercent: 4.2, label: '30 Days', note: 'Full month reschedule' },
];

// Repayment terms strictly 6 months onwards up to 24 months (2 years)
export const TERM_MONTH_OPTIONS = [6, 12, 24];
export const QUICK_AMOUNTS = [10000, 30000, 60000, 100000, 150000, 200000];
export const EXTENSION_QUICK_TIERS = [10000, 30000, 60000, 100000, 200000];
export const REFERRAL_CODE = 'ZENKA-254-WEB';

export function formatKsh(value: number, withDecimals = false): string {
  return `KSh ${value.toLocaleString('en-KE', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })}`;
}

export function formatTermLabel(months: number): string {
  return months === 24 ? '2 Years' : `${months} Months`;
}

export function formatMaturityDate(monthsFromNow: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDueDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function findExactTier(principal: number): LoanTier | null {
  return LOAN_TIERS.find((tier) => tier.principal === principal) ?? null;
}

export function matchNearestTier(principal: number): LoanTier {
  return (
    findExactTier(principal) ||
    LOAN_TIERS.reduce((closest, current) =>
      Math.abs(current.principal - principal) < Math.abs(closest.principal - principal)
        ? current
        : closest
    )
  );
}

export function findPackageForTier(tier: LoanTier): LoanPackage {
  return LOAN_PACKAGES.find((pkg) => pkg.id === tier.packageId) ?? LOAN_PACKAGES[0];
}

export function calculateLoan(amount: number, termMonths: number): LoanCalculation {
  const tier = matchNearestTier(amount);
  const matchedPackage = findPackageForTier(tier);
  const safeMonths = TERM_MONTH_OPTIONS.includes(termMonths) ? termMonths : 24;
  const effectiveFeePercent = Number(((tier.fee / tier.principal) * 100).toFixed(2));
  const totalRepayment = tier.principal + tier.fee;
  const monthlyInstallment = Math.round(totalRepayment / safeMonths);

  return {
    amount: tier.principal,
    feeAmount: tier.fee,
    effectiveFeePercent,
    totalRepayment,
    termMonths: safeMonths,
    matchedPackage,
    monthlyInstallment,
    dueDateFormatted: formatMaturityDate(safeMonths),
  };
}

export function calculateExtensionFee(principal: number, days: number): number | null {
  const tier = findExactTier(principal);
  const option = EXTENSION_OPTIONS.find((item) => item.days === days);
  if (!tier || !option) {
    return null;
  }
  return Math.max(10, Math.round((tier.principal * option.feePercent) / 100));
}

export function normalizeKenyanPhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-()]/g, '');
  if (/^\+254(7|1)\d{8}$/.test(cleaned)) {
    return cleaned.slice(1);
  }
  if (/^254(7|1)\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^0(7|1)\d{8}$/.test(cleaned)) {
    return `254${cleaned.slice(1)}`;
  }
  return null;
}
