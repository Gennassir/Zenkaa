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
  supportedTerms: number[];
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
  termDays: number;
  matchedPackage: LoanPackage;
  dailyCost: number;
  dueDateFormatted: string;
}

export type DrawerIntent =
  | { type: 'loan'; calculation: LoanCalculation }
  | { type: 'extension'; balance: number; option: ExtensionOption; extensionFee: number }
  | { type: 'referral'; bonusAmount: number; friendCount: number };

export const LOAN_TIERS: LoanTier[] = [
  { principal: 10000, fee: 99, packageId: 'starter-flex' },
  { principal: 12500, fee: 129, packageId: 'starter-flex' },
  { principal: 16000, fee: 179, packageId: 'starter-flex' },
  { principal: 21000, fee: 199, packageId: 'growth-plus' },
  { principal: 25500, fee: 219, packageId: 'growth-plus' },
  { principal: 30000, fee: 349, packageId: 'growth-plus' },
  { principal: 35000, fee: 419, packageId: 'biashara-pro' },
  { principal: 40000, fee: 539, packageId: 'biashara-pro' },
  { principal: 45000, fee: 679, packageId: 'biashara-pro' },
  { principal: 50000, fee: 959, packageId: 'zenka-prime' },
  { principal: 60000, fee: 1549, packageId: 'zenka-prime' },
  { principal: 70000, fee: 1999, packageId: 'zenka-prime' },
];

export const LOAN_PACKAGES: LoanPackage[] = [
  {
    id: 'starter-flex',
    name: 'Starter Flex',
    audience: 'For first-time borrowers and everyday needs',
    minAmount: 10000,
    maxAmount: 16000,
    supportedTerms: [14, 30],
    gracePeriodDays: 3,
    disbursementSpeed: 'Instant via M-Pesa',
    summary: 'Accessible entry tiers with fixed facilitation fees starting at KSh 99.',
    tiers: LOAN_TIERS.filter((t) => t.packageId === 'starter-flex'),
  },
  {
    id: 'growth-plus',
    name: 'Growth Plus',
    audience: 'For repeat borrowers and household liquidity',
    minAmount: 21000,
    maxAmount: 30000,
    supportedTerms: [14, 30, 61],
    gracePeriodDays: 7,
    disbursementSpeed: 'Instant via M-Pesa',
    recommended: true,
    summary: 'Our best value mid-tier credit with a complimentary 7-day grace window.',
    tiers: LOAN_TIERS.filter((t) => t.packageId === 'growth-plus'),
  },
  {
    id: 'biashara-pro',
    name: 'Biashara Pro',
    audience: 'For SME stock restocks and working capital',
    minAmount: 35000,
    maxAmount: 45000,
    supportedTerms: [30, 61],
    gracePeriodDays: 7,
    disbursementSpeed: 'Under 3 minutes',
    summary: 'Structured working capital for merchants turning inventory over 30–61 days.',
    tiers: LOAN_TIERS.filter((t) => t.packageId === 'biashara-pro'),
  },
  {
    id: 'zenka-prime',
    name: 'Zenka Prime',
    audience: 'For verified loyal members up to full limit',
    minAmount: 50000,
    maxAmount: 70000,
    supportedTerms: [61],
    gracePeriodDays: 10,
    disbursementSpeed: 'Priority M-Pesa',
    summary: 'High-limit 61-day credit with a 10-day grace window and priority settlement.',
    tiers: LOAN_TIERS.filter((t) => t.packageId === 'zenka-prime'),
  },
];

export const EXTENSION_OPTIONS: ExtensionOption[] = [
  { days: 7, feePercent: 1.5, label: '7 Days', note: 'Short bridge window' },
  { days: 14, feePercent: 2.5, label: '14 Days', note: 'Two-week breathing room' },
  { days: 30, feePercent: 4.2, label: '30 Days', note: 'Full month reschedule' },
];

export const TERM_OPTIONS = [14, 30, 61];
export const QUICK_AMOUNTS = [10000, 16000, 21000, 30000, 50000, 70000];
export const EXTENSION_QUICK_TIERS = [10000, 21000, 35000, 50000, 70000];
export const REFERRAL_CODE = 'ZENKA-254-WEB';

export function formatKsh(value: number, withDecimals = false): string {
  return `KSh ${value.toLocaleString('en-KE', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })}`;
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

export function calculateLoan(amount: number, termDays: number): LoanCalculation {
  const tier = matchNearestTier(amount);
  const matchedPackage = findPackageForTier(tier);
  const effectiveFeePercent = Number(((tier.fee / tier.principal) * 100).toFixed(2));
  const totalRepayment = tier.principal + tier.fee;
  const dailyCost = Math.round(totalRepayment / termDays);

  return {
    amount: tier.principal,
    feeAmount: tier.fee,
    effectiveFeePercent,
    totalRepayment,
    termDays,
    matchedPackage,
    dailyCost,
    dueDateFormatted: formatDueDate(termDays),
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
