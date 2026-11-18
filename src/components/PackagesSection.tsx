import { ArrowUpRight } from 'lucide-react';
import {
  LOAN_PACKAGES,
  LOAN_TIERS,
  findPackageForTier,
  formatKsh,
  type LoanPackage,
  type LoanTier,
} from '../data/zenkaData';

interface PackagesSectionProps {
  selectedAmount: number;
  selectedPackageId: string;
  onSelectTier: (tier: LoanTier, pkg: LoanPackage) => void;
}

export function PackagesSection({
  selectedAmount,
  selectedPackageId,
  onSelectTier,
}: PackagesSectionProps) {
  return (
    <section
      id="packages"
      className="bg-white border-b border-[#E5E0EC] py-12 sm:py-16 lg:py-20"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-8 sm:mb-10">
          <p className="text-xs font-semibold tracking-wide text-[#521878] mb-2">
            01. Loan Packages &amp; Fixed Fees
          </p>
          <h2
            className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#1C1424]"
            style={{ textWrap: 'balance' }}
          >
            Twelve transparent credit tiers with exact upfront fees
          </h2>
          <p className="text-sm sm:text-base text-[#5C5268] mt-3 leading-relaxed">
            Pick any loan amount from KSh 10,000 to KSh 70,000. Each tier carries a fixed facilitation fee settled cleanly via M-Pesa STK Push.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {LOAN_PACKAGES.map((pkg) => {
            const isActive = selectedPackageId === pkg.id;
            const isGrowth = pkg.id === 'growth-plus';
            const isPrime = pkg.id === 'zenka-prime';
            const isBiashara = pkg.id === 'biashara-pro';
            const isDark = isGrowth || isPrime;

            const cardTheme = isGrowth
              ? 'bg-[#521878] text-white border-[#521878]'
              : isPrime
                ? 'bg-[#141212] text-white border-[#2E2633]'
                : isBiashara
                  ? 'bg-[#FAF9FC] text-[#1C1424] border-[#DCD3E6]'
                  : 'bg-white text-[#1C1424] border-[#E5E0EC]';

            const activeRing = isActive
              ? isDark
                ? 'ring-2 ring-[#FFD200] ring-offset-2 ring-offset-white'
                : 'ring-2 ring-[#521878] ring-offset-2 ring-offset-white'
              : '';

            const mutedText = isDark ? 'text-white/75' : 'text-[#5C5268]';
            const accentText = isDark ? 'text-[#FFD200]' : 'text-[#521878]';
            const dividerColor = isDark ? 'border-white/15' : 'border-[#E5E0EC]';
            const primaryTier =
              pkg.tiers.find((t) => t.principal === selectedAmount) ?? pkg.tiers[0];

            return (
              <article
                key={pkg.id}
                className={`relative rounded-2xl border overflow-hidden p-5 sm:p-6 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 ${cardTheme} ${activeRing}`}
              >
                {isGrowth && (
                  <div
                    aria-hidden="true"
                    className="absolute -top-14 -right-14 w-36 h-36 rounded-full bg-[#FFD200]/15 pointer-events-none"
                  />
                )}
                {isPrime && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 88% 12%, rgba(143, 88, 18, 0.45) 0%, rgba(20, 18, 18, 0) 60%)',
                    }}
                  />
                )}
                {isBiashara && (
                  <div
                    aria-hidden="true"
                    className="absolute top-0 inset-x-0 h-1 bg-[#FFD200] pointer-events-none"
                  />
                )}
                {!isDark && !isBiashara && (
                  <div
                    aria-hidden="true"
                    className="absolute top-0 inset-x-0 h-1 bg-[#521878] pointer-events-none"
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 text-xs mb-2.5">
                    <span className={`font-semibold ${accentText}`}>
                      {isActive
                        ? 'Active in calculator'
                        : pkg.recommended
                          ? 'Most Selected'
                          : `${pkg.gracePeriodDays}-day grace`}
                    </span>
                    <span className={mutedText} aria-hidden="true">
                      ·
                    </span>
                    <span className={`tabular-nums ${mutedText}`}>
                      {pkg.supportedTerms.join(' / ')} days
                    </span>
                  </div>

                  <h3
                    className={`font-display text-xl font-bold ${
                      isDark ? 'text-white' : 'text-[#1C1424]'
                    }`}
                  >
                    {pkg.name}
                  </h3>
                  <p className={`text-xs mt-1 min-h-[2.25rem] ${mutedText}`}>
                    {pkg.audience}
                  </p>

                  <div className={`my-5 py-3 border-y ${dividerColor} space-y-1.5`}>
                    {pkg.tiers.map((tier) => {
                      const tierSelected = selectedAmount === tier.principal;
                      return (
                        <button
                          key={tier.principal}
                          type="button"
                          onClick={() => onSelectTier(tier, pkg)}
                          className={`w-full min-h-[40px] flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                            tierSelected
                              ? isDark
                                ? 'bg-[#FFD200] text-[#141212] font-bold'
                                : 'bg-[#521878] text-white font-bold'
                              : isDark
                                ? 'hover:bg-white/10 text-white'
                                : 'hover:bg-[#FAF9FC] text-[#1C1424]'
                          }`}
                        >
                          <span className="tabular-nums font-semibold">
                            {formatKsh(tier.principal)}
                          </span>
                          <span
                            className={`tabular-nums font-semibold ${
                              tierSelected
                                ? isDark
                                  ? 'text-[#141212]'
                                  : 'text-[#FFD200]'
                                : isDark
                                  ? 'text-[#FFD200]'
                                  : 'text-[#521878]'
                            }`}
                          >
                            Fee {formatKsh(tier.fee)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className={`text-xs leading-relaxed mb-6 ${mutedText}`}>
                    {pkg.summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTier(primaryTier, pkg)}
                  className={`relative z-10 w-full min-h-[44px] py-3 px-4 rounded-full text-xs font-bold tracking-wide inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    isDark || isBiashara
                      ? 'bg-[#FFD200] hover:bg-[#F2C400] text-[#141212] focus-visible:outline-[#FFD200]'
                      : 'bg-[#521878] hover:bg-[#3B0F58] text-white focus-visible:outline-[#521878]'
                  }`}
                >
                  Apply {formatKsh(primaryTier.principal)}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </article>
            );
          })}
        </div>

        {/* Complete Package & Fee Schedule */}
        <div className="mt-10 sm:mt-12 bg-[#FAF9FC] border border-[#E5E0EC] rounded-2xl overflow-hidden">
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-[#E5E0EC] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1C1424]">
                Complete Package &amp; Fee Schedule
              </h3>
              <p className="text-xs text-[#5C5268]">
                Click any tier row to initiate M-Pesa STK Push checkout for its exact facilitation fee.
              </p>
            </div>
            <span className="text-xs font-medium text-[#521878] shrink-0">
              Currency: Kenyan Shilling (KSh)
            </span>
          </div>

          {/* Mobile Card List (zero horizontal scroll on phones) */}
          <div className="sm:hidden divide-y divide-[#E5E0EC]">
            {LOAN_TIERS.map((tier) => {
              const pkg = findPackageForTier(tier);
              const feePercent = ((tier.fee / tier.principal) * 100).toFixed(2);
              const totalRepayment = tier.principal + tier.fee;
              const isRowSelected = selectedAmount === tier.principal;

              return (
                <div
                  key={tier.principal}
                  className={`p-4 space-y-2.5 ${isRowSelected ? 'bg-white' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-[#1C1424]">
                        {formatKsh(tier.principal)}
                      </p>
                      <p className="text-xs text-[#5C5268]">{pkg.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectTier(tier, pkg)}
                      className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        isRowSelected
                          ? 'bg-[#521878] text-white'
                          : 'bg-white border border-[#E5E0EC] text-[#521878] hover:bg-[#521878] hover:text-white hover:border-[#521878]'
                      }`}
                    >
                      Select
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E0EC]/70 text-xs">
                    <div>
                      <span className="block text-[#5C5268]">Fixed Fee</span>
                      <span className="font-bold text-[#521878] tabular-nums">
                        {formatKsh(tier.fee)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[#5C5268]">Fee %</span>
                      <span className="font-medium text-[#1C1424] tabular-nums">
                        {feePercent}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[#5C5268]">Total</span>
                      <span className="font-bold text-[#1C1424] tabular-nums">
                        {formatKsh(totalRepayment)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E0EC] text-xs font-semibold text-[#5C5268] bg-white">
                  <th className="py-3.5 px-6">Package</th>
                  <th className="py-3.5 px-4 text-right">Loan Amount</th>
                  <th className="py-3.5 px-4 text-right">Fixed Fee</th>
                  <th className="py-3.5 px-4 text-right">Fee %</th>
                  <th className="py-3.5 px-4 text-right">Total Repayment</th>
                  <th className="py-3.5 px-6 text-right">Checkout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0EC]">
                {LOAN_TIERS.map((tier) => {
                  const pkg = findPackageForTier(tier);
                  const feePercent = ((tier.fee / tier.principal) * 100).toFixed(2);
                  const totalRepayment = tier.principal + tier.fee;
                  const isRowSelected = selectedAmount === tier.principal;

                  return (
                    <tr
                      key={tier.principal}
                      className={`transition-colors ${
                        isRowSelected ? 'bg-white' : 'hover:bg-white'
                      }`}
                    >
                      <td className="py-3 px-6 font-semibold text-[#1C1424]">
                        {pkg.name}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#1C1424] tabular-nums">
                        {formatKsh(tier.principal)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#521878] tabular-nums">
                        {formatKsh(tier.fee)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#5C5268] tabular-nums">
                        {feePercent}%
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#1C1424] tabular-nums">
                        {formatKsh(totalRepayment)}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectTier(tier, pkg)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            isRowSelected
                              ? 'bg-[#521878] text-white'
                              : 'bg-white border border-[#E5E0EC] text-[#521878] hover:bg-[#521878] hover:text-white hover:border-[#521878]'
                          }`}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
