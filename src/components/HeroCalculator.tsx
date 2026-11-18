import { ArrowRight } from 'lucide-react';
import {
  LOAN_TIERS,
  QUICK_AMOUNTS,
  TERM_OPTIONS,
  formatKsh,
  type LoanCalculation,
} from '../data/zenkaData';
import { ZenkaLogo } from './ZenkaLogo';

interface HeroCalculatorProps {
  amount: number;
  termDays: number;
  calculation: LoanCalculation;
  onAmountChange: (amount: number) => void;
  onTermChange: (days: number) => void;
  onApply: () => void;
}

export function HeroCalculator({
  amount,
  termDays,
  calculation,
  onAmountChange,
  onTermChange,
  onApply,
}: HeroCalculatorProps) {
  const sliderIndex = Math.max(
    0,
    LOAN_TIERS.findIndex((tier) => tier.principal === calculation.amount)
  );
  const progressPercent = (sliderIndex / Math.max(1, LOAN_TIERS.length - 1)) * 100;

  return (
    <section id="calculator" className="bg-[#FAF9FC] border-b border-[#E5E0EC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pt-10 sm:pb-12 lg:pt-14 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-stretch">
          {/* Hero Card */}
          <div className="lg:col-span-6 relative rounded-2xl bg-[#141212] text-white overflow-hidden p-6 sm:p-10 flex flex-col justify-between min-h-[380px] sm:min-h-[460px]">
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 85% 20%, rgba(143, 88, 18, 0.55) 0%, rgba(20, 18, 18, 0.95) 62%)',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute -top-16 -right-16 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-[#521878] opacity-95 pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-20 -right-10 w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-[#FFD200] opacity-95 pointer-events-none"
            />

            <div
              aria-hidden="true"
              className="hidden sm:flex absolute bottom-7 right-7 flex-col items-end text-right pointer-events-none select-none"
            >
              <span className="font-display text-2xl font-extrabold leading-none text-[#521878]">
                61 DAY
              </span>
              <span className="font-display text-lg font-semibold leading-tight text-[#141212]">
                TERMS
              </span>
            </div>

            <div className="relative z-10 max-w-lg">
              <p className="text-xs font-medium tracking-wide text-[#FFD200] mb-3 sm:mb-4">
                Zenka Web Portal · M-Pesa STK Express · Kenya
              </p>
              <h1
                className="font-display font-bold tracking-tight text-white leading-[1.08] mb-4 sm:mb-5"
                style={{
                  fontSize: 'clamp(1.85rem, 4vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                Borrow up to <span className="text-[#FFD200]">KSh 70,000</span> with fees from KSh 99.
              </h1>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-md mb-6 sm:mb-8">
                Select your exact loan package, review the transparent flat fee upfront, and verify effortlessly with instant M-Pesa STK Push checkout.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#packages"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#FFD200] hover:bg-[#F2C400] text-[#141212] text-sm font-bold transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD200] min-h-[44px]"
                >
                  Explore Loan Packages
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="relative z-10 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-white/15 flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs text-white/75 sm:pr-28">
              <span>Fixed flat fees</span>
              <span aria-hidden="true">·</span>
              <span>14–61 day terms</span>
              <span aria-hidden="true">·</span>
              <span>Instant M-Pesa STK Push</span>
            </div>
          </div>

          {/* Interactive Calculator Card */}
          <div className="lg:col-span-6 bg-white border border-[#E5E0EC] rounded-2xl p-5 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-[#E5E0EC]">
                <div className="flex items-center gap-3 min-w-0">
                  <ZenkaLogo showWordmark={false} />
                  <div className="min-w-0">
                    <h2 className="font-display text-base sm:text-lg font-bold text-[#1C1424] leading-snug">
                      Total cost calculated loan
                    </h2>
                    <p className="text-xs text-[#5C5268] truncate">
                      Matched package:{' '}
                      <span className="font-semibold text-[#521878]">
                        {calculation.matchedPackage.name}
                      </span>
                    </p>
                  </div>
                </div>
                <span className="font-display text-xs font-semibold text-[#521878] tabular-nums whitespace-nowrap shrink-0">
                  12 Fixed Tiers
                </span>
              </div>

              <div className="pt-5 sm:pt-6 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-3">
                  <label
                    htmlFor="loan-tier-select"
                    className="text-sm font-medium text-[#5C5268]"
                  >
                    I would like to borrow
                  </label>
                  <select
                    id="loan-tier-select"
                    value={calculation.amount}
                    onChange={(e) => onAmountChange(Number(e.target.value))}
                    className="font-display text-lg sm:text-xl font-bold text-[#1C1424] bg-[#FAF9FC] border border-[#E5E0EC] rounded-lg px-3 py-2 sm:py-1.5 tabular-nums outline-none focus:border-[#521878] focus:ring-2 focus:ring-[#521878]/15 cursor-pointer min-h-[44px] sm:min-h-0"
                  >
                    {LOAN_TIERS.map((tier) => (
                      <option key={tier.principal} value={tier.principal}>
                        {formatKsh(tier.principal)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="py-2">
                  <input
                    type="range"
                    aria-label="Borrow tier slider"
                    min={0}
                    max={LOAN_TIERS.length - 1}
                    step={1}
                    value={sliderIndex}
                    onChange={(e) => {
                      const matched = LOAN_TIERS[Number(e.target.value)];
                      if (matched) {
                        onAmountChange(matched.principal);
                      }
                    }}
                    className="zenka-slider w-full cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #521878 0%, #521878 ${progressPercent}%, #E5E0EC ${progressPercent}%, #E5E0EC 100%)`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C5268] tabular-nums mt-1">
                  <span>KSh 10,000</span>
                  <span>KSh 70,000</span>
                </div>

                <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 mt-4">
                  {QUICK_AMOUNTS.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => onAmountChange(quickAmount)}
                      className={`px-2 sm:px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 text-xs font-semibold rounded-lg border transition-colors tabular-nums whitespace-nowrap cursor-pointer ${
                        amount === quickAmount
                          ? 'bg-[#521878] border-[#521878] text-white'
                          : 'bg-white border-[#E5E0EC] text-[#5C5268] hover:border-[#521878]/50 hover:text-[#1C1424]'
                      }`}
                    >
                      {formatKsh(quickAmount)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="py-4 border-t border-[#E5E0EC]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <span className="text-sm font-medium text-[#5C5268]">Repayment duration</span>
                  <span className="text-xs text-[#5C5268] tabular-nums">
                    Due {calculation.dueDateFormatted}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {TERM_OPTIONS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => onTermChange(days)}
                      className={`py-2.5 px-1.5 sm:px-3 min-h-[44px] rounded-xl border text-center transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                        termDays === days
                          ? 'bg-[#521878] border-[#521878] text-white font-semibold'
                          : 'bg-[#FAF9FC] border-[#E5E0EC] text-[#1C1424] hover:border-[#521878]/50 font-medium'
                      }`}
                    >
                      <span className="text-xs sm:text-sm tabular-nums">For {days} days</span>
                    </button>
                  ))}
                </div>
              </div>

              <dl className="py-4 border-t border-[#E5E0EC] space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#5C5268]">Loan principal</dt>
                  <dd className="font-semibold text-[#1C1424] tabular-nums shrink-0">
                    {formatKsh(calculation.amount, true)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#5C5268]">
                    Package facilitation fee ({calculation.effectiveFeePercent}%)
                  </dt>
                  <dd className="font-semibold text-[#521878] tabular-nums shrink-0">
                    {formatKsh(calculation.feeAmount, true)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-[#E5E0EC]">
                  <dt className="font-semibold text-[#1C1424]">Total repayment at maturity</dt>
                  <dd className="font-display text-xl sm:text-2xl font-bold text-[#1C1424] tabular-nums shrink-0">
                    {formatKsh(calculation.totalRepayment, true)}
                  </dd>
                </div>
              </dl>
            </div>

            <button
              type="button"
              onClick={onApply}
              className="mt-4 w-full min-h-[48px] py-3.5 px-4 sm:px-6 rounded-full bg-[#521878] hover:bg-[#3B0F58] text-white text-xs sm:text-sm font-bold tracking-wide transition-colors duration-150 cursor-pointer sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#521878]"
            >
              APPLY &amp; PAY FEE ({formatKsh(calculation.feeAmount)}) VIA M-PESA
            </button>
          </div>
        </div>

        {/* Bottom 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
          <div className="bg-white border border-[#E5E0EC] rounded-xl p-4 sm:p-5">
            <p className="text-xs text-[#5C5268] mb-1">Loan Tiers</p>
            <p className="font-display text-base sm:text-xl font-bold text-[#1C1424] tabular-nums">
              KSh 10,000 – 70,000
            </p>
          </div>
          <div className="bg-white border border-[#E5E0EC] rounded-xl p-4 sm:p-5">
            <p className="text-xs text-[#5C5268] mb-1">Flexible Tenors</p>
            <p className="font-display text-base sm:text-xl font-bold text-[#1C1424] tabular-nums">
              14 to 61 Days
            </p>
          </div>
          <div className="bg-white border border-[#E5E0EC] rounded-xl p-4 sm:p-5">
            <p className="text-xs text-[#5C5268] mb-1">Fixed Package Fees</p>
            <p className="font-display text-base sm:text-xl font-bold text-[#521878] tabular-nums">
              KSh 99 – 1,999
            </p>
          </div>
          <div className="bg-white border border-[#E5E0EC] rounded-xl p-4 sm:p-5">
            <p className="text-xs text-[#5C5268] mb-1">Checkout Channel</p>
            <p className="font-display text-base sm:text-xl font-bold text-[#1C1424]">
              M-Pesa STK Push
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
