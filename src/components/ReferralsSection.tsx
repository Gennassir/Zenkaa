import { useState } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { REFERRAL_CODE, formatKsh } from '../data/zenkaData';

interface ReferralsSectionProps {
  onWithdrawBonus: (bonusAmount: number, friendCount: number) => void;
}

export function ReferralsSection({ onWithdrawBonus }: ReferralsSectionProps) {
  const [friendCount, setFriendCount] = useState(8);
  const [copied, setCopied] = useState(false);

  const bonusAmount = friendCount * 100;
  const progressPercent = ((friendCount - 1) / 49) * 100;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(REFERRAL_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      id="referrals"
      className="bg-[#FAF9FC] border-b border-[#E5E0EC] py-12 sm:py-16 lg:py-20"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-5 relative rounded-2xl bg-[#FFD200] text-[#521878] p-6 sm:p-10 overflow-hidden flex flex-col justify-between min-h-[300px] sm:min-h-[360px]">
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-[#521878]/10 pointer-events-none"
            />
            <div className="relative z-10">
              <p className="text-xs font-semibold tracking-wide text-[#1C1424] mb-3">
                03. Invite Friends &amp; Earn
              </p>
              <h2
                className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#521878] leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                Get a bonus from invitations straight to your M-Pesa.
              </h2>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-[#521878]/20">
              <p className="text-sm font-medium text-[#1C1424] leading-relaxed">
                Earn <span className="font-bold text-[#521878]">KSh 100</span> credit on each friend&apos;s first repaid loan. Withdraw accumulated earnings directly to your registered M-Pesa number with zero withdrawal fee.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E5E0EC] rounded-2xl p-5 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E0EC]">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#1C1424]">
                    Invite friends &amp; calculate your bonus
                  </h3>
                  <p className="text-xs text-[#5C5268] mt-1">
                    Share your personal Zenka Web referral code with friends in Kenya.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-lg border border-[#E5E0EC] bg-[#FAF9FC] hover:border-[#521878] transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <span className="font-mono text-xs font-semibold text-[#1C1424] tracking-wider">
                    {REFERRAL_CODE}
                  </span>
                  {copied ? (
                    <Check className="w-4 h-4 text-[#16A34A]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#521878]" />
                  )}
                  <span className="text-xs font-semibold text-[#521878]">
                    {copied ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>

              <div className="py-6">
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <label
                    htmlFor="referral-friends-slider"
                    className="text-sm font-medium text-[#5C5268]"
                  >
                    Friends who repay their first loan
                  </label>
                  <span className="font-display text-xl sm:text-2xl font-bold text-[#1C1424] tabular-nums shrink-0">
                    {friendCount} {friendCount === 1 ? 'friend' : 'friends'}
                  </span>
                </div>

                <div className="py-2">
                  <input
                    id="referral-friends-slider"
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    value={friendCount}
                    onChange={(e) => setFriendCount(Number(e.target.value))}
                    className="zenka-slider w-full cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #521878 0%, #521878 ${progressPercent}%, #E5E0EC ${progressPercent}%, #E5E0EC 100%)`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C5268] tabular-nums mt-1">
                  <span>1 friend (KSh 100)</span>
                  <span>50 friends (KSh 5,000)</span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-[#E5E0EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#5C5268]">
                  Direct M-Pesa payout · KSh 100 × {friendCount}
                </p>
                <p className="font-display text-2xl sm:text-3xl font-bold text-[#521878] tabular-nums mt-0.5">
                  {formatKsh(bonusAmount, true)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onWithdrawBonus(bonusAmount, friendCount)}
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-full bg-[#521878] hover:bg-[#3B0F58] text-white text-xs sm:text-sm font-bold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                INVITE &amp; WITHDRAW TO M-PESA
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
