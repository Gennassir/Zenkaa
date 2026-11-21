import { CircleCheck } from 'lucide-react';
import {
  LOAN_TIERS,
  findPackageForTier,
  type ApplicantProfile,
  type LoanPackage,
  type LoanTier,
} from '../data/zenkaData';

interface PackagesSectionProps {
  selectedAmount: number;
  selectedPackageId: string;
  verifiedApplicant: ApplicantProfile | null;
  onSelectTier: (tier: LoanTier, pkg: LoanPackage) => void;
}

export function PackagesSection({
  selectedAmount,
  verifiedApplicant,
  onSelectTier,
}: PackagesSectionProps) {
  return (
    <section
      id="packages"
      className="bg-[#FAF9FC] border-b border-[#E5E0EC] py-12 sm:py-16 lg:py-20"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {verifiedApplicant && (
          <div className="mb-8 rounded-2xl border border-[#521878]/25 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFD200] text-[#521878] flex items-center justify-center shrink-0">
                <CircleCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1C1424]">
                  CRB Eligibility Confirmed for {verifiedApplicant.fullName}
                </p>
                <p className="text-xs text-[#5C5268]">
                  You qualify up to KES 200,000. Select any loan package below to complete M-Pesa STK Push checkout.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-[#521878] shrink-0">
              ID: {verifiedApplicant.nationalId}
            </span>
          </div>
        )}

        <div className="max-w-2xl mb-8 sm:mb-10">
          <p className="text-xs font-semibold tracking-wide text-[#521878] mb-2">
            01. Loan Packages &amp; Fixed Fees
          </p>
          <h2
            className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#1C1424]"
            style={{ textWrap: 'balance' }}
          >
            Choose your loan amount up to KES 200,000
          </h2>
          <p className="text-sm sm:text-base text-[#5C5268] mt-3 leading-relaxed">
            Select any loan tier below with 6, 12, or 24-month (2-year) repayment schedules and instant M-Pesa STK Push checkout.
          </p>
        </div>

        {/* 3x4 Grid Arrangement Matching Reference Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {LOAN_TIERS.map((tier) => {
            const pkg = findPackageForTier(tier);
            const isSelected = selectedAmount === tier.principal;

            return (
              <article
                key={tier.principal}
                className={`rounded-2xl bg-white border p-4 sm:p-6 flex flex-col justify-between transition-all duration-150 ${
                  isSelected
                    ? 'border-[#521878] ring-2 ring-[#521878]/20 shadow-sm'
                    : 'border-[#E5E0EC] hover:border-[#521878]/40'
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-[#5C5268]">Loan Amount</p>
                  <p className="font-display text-lg sm:text-2xl font-bold text-[#1C1424] tabular-nums mt-1">
                    KES {tier.principal.toLocaleString('en-KE')}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEECEC] text-[#C83232]">
                      M-Pesa
                    </span>
                    <span className="text-[11px] font-medium text-[#5C5268] tabular-nums">
                      Fee KES {tier.fee.toLocaleString('en-KE')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTier(tier, pkg)}
                  className={`mt-4 sm:mt-5 w-full min-h-[42px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#521878] ${
                    isSelected
                      ? 'bg-[#521878] border-[#521878] text-white hover:bg-[#3B0F58]'
                      : 'bg-[#F5F6F8] border-[#E5E0EC] text-[#1C1424] hover:bg-[#521878] hover:border-[#521878] hover:text-white'
                  }`}
                >
                  Select Loan
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
