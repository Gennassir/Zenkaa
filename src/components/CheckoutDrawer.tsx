import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  Clock,
  LoaderCircle,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import {
  formatKsh,
  normalizeKenyanPhone,
  type ApplicantProfile,
  type DrawerIntent,
} from '../data/zenkaData';
import { ZenkaLogo } from './ZenkaLogo';

const STK_TIMEOUT_SECONDS = 90;

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `znk-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

type DrawerStep =
  | 'details'
  | 'checkout'
  | 'awaiting_pin'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

interface CheckoutDrawerProps {
  intent: DrawerIntent | null;
  applicantProfile?: ApplicantProfile | null;
  onClose: () => void;
}

export function CheckoutDrawer({
  intent,
  applicantProfile,
  onClose,
}: CheckoutDrawerProps) {
  const [step, setStep] = useState<DrawerStep>('details');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('Working Capital / Biashara');
  const [errorMsg, setErrorMsg] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [receiptCode, setReceiptCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [confirmedAmount, setConfirmedAmount] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(STK_TIMEOUT_SECONDS);

  const pollIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (intent) {
      clearTimers();
      setStep('details');
      setErrorMsg('');
      setFailureReason('');
      setReceiptCode('');
      setSubmitting(false);
      setIdempotencyKey(generateIdempotencyKey());
      setCheckoutRequestId('');
      setSessionToken('');
      setMaskedPhone('');
      setSecondsRemaining(STK_TIMEOUT_SECONDS);
      if (applicantProfile) {
        if (applicantProfile.fullName) setFullName(applicantProfile.fullName);
        if (applicantProfile.phone) setPhone(applicantProfile.phone);
        if (applicantProfile.nationalId) setNationalId(applicantProfile.nationalId);
      }
    }
    return () => clearTimers();
  }, [intent, applicantProfile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && intent) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [intent, onClose]);

  const checkStkStatus = async (reqId: string, token: string): Promise<string> => {
    setVerifying(true);
    try {
      const response = await fetch(
        `/api/stk/status?checkoutRequestId=${encodeURIComponent(reqId)}`,
        {
          method: 'GET',
          headers: { 'X-Session-Token': token },
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data.status) {
        return 'pending';
      }
      if (typeof data.amount === 'number') {
        setConfirmedAmount(data.amount);
      }
      if (data.maskedPhone) {
        setMaskedPhone(data.maskedPhone);
      }
      if (data.receiptCode) {
        setReceiptCode(data.receiptCode);
      }
      if (data.status === 'success') {
        clearTimers();
        setStep('confirmed');
      } else if (data.status === 'failed') {
        clearTimers();
        setFailureReason(
          data.message || 'The M-Pesa payment could not be completed. Please try again.'
        );
        setStep('failed');
      } else if (data.status === 'cancelled') {
        clearTimers();
        setStep('cancelled');
      } else if (data.status === 'expired' || data.status === 'timeout') {
        clearTimers();
        setStep('timeout');
      }
      return data.status;
    } catch {
      return 'pending';
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (step === 'awaiting_pin' && checkoutRequestId && sessionToken) {
      setSecondsRemaining(STK_TIMEOUT_SECONDS);
      countdownIntervalRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearTimers();
            void checkStkStatus(checkoutRequestId, sessionToken).then((status) => {
              if (
                status !== 'success' &&
                status !== 'cancelled' &&
                status !== 'failed'
              ) {
                setStep('timeout');
              }
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      pollIntervalRef.current = window.setInterval(() => {
        void checkStkStatus(checkoutRequestId, sessionToken);
      }, 3000);

      return () => clearTimers();
    }
  }, [step, checkoutRequestId, sessionToken]);

  if (!intent) {
    return null;
  }

  const handleDetailsSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }
    if (!normalizeKenyanPhone(phone)) {
      setErrorMsg(
        'Enter a valid Kenyan M-Pesa number (e.g. 0712 345 678 or +254 712 345 678).'
      );
      return;
    }
    if (intent.type === 'loan' && !/^\d{6,10}$/.test(nationalId.trim())) {
      setErrorMsg('Enter a valid Kenyan National ID (6–10 digits).');
      return;
    }

    setStep('checkout');
  };

  const handleInitiateCheckout = async () => {
    if (intent.type === 'referral') {
      setConfirmedAmount(intent.bonusAmount);
      setMaskedPhone(normalizeKenyanPhone(phone) ?? phone);
      setStep('confirmed');
      return;
    }

    setErrorMsg('');
    setFailureReason('');
    setReceiptCode('');
    setSubmitting(true);

    const payload =
      intent.type === 'loan'
        ? {
            intentType: 'loan_fee',
            tierPrincipal: intent.calculation.amount,
            phoneNumber: phone,
            fullName: fullName.trim(),
            nationalId: nationalId.trim(),
            idempotencyKey,
          }
        : {
            intentType: 'extension_fee',
            tierPrincipal: intent.balance,
            extensionDays: intent.option.days,
            phoneNumber: phone,
            fullName: fullName.trim(),
            idempotencyKey,
          };

    try {
      const response = await fetch('/api/stk/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data.checkoutRequestId || !data.sessionToken) {
        setErrorMsg(
          data?.message ??
            `Unable to initiate M-Pesa payment right now (HTTP ${response.status}). Please try again.`
        );
        return;
      }

      setCheckoutRequestId(data.checkoutRequestId);
      setSessionToken(data.sessionToken);
      setConfirmedAmount(data.amount ?? 0);
      setMaskedPhone(data.maskedPhone ?? '');
      setStep('awaiting_pin');
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    clearTimers();
    setIdempotencyKey(generateIdempotencyKey());
    setErrorMsg('');
    setFailureReason('');
    setReceiptCode('');
    setStep('checkout');
  };

  const drawerTitle =
    intent.type === 'loan'
      ? 'Apply for Loan'
      : intent.type === 'extension'
        ? 'Loan Extension Payment'
        : 'M-Pesa Bonus Withdrawal';

  const normalizedPhone = normalizeKenyanPhone(phone) ?? phone;
  const dueFeeAmount =
    intent.type === 'loan'
      ? intent.calculation.feeAmount
      : intent.type === 'extension'
        ? intent.extensionFee
        : intent.bonusAmount;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#141212]/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={drawerTitle}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full overflow-y-auto border-l border-[#E5E0EC] flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-[#E5E0EC] flex items-center justify-between gap-4 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3 min-w-0">
              <ZenkaLogo showWordmark={false} />
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-bold text-[#1C1424] truncate">
                  {drawerTitle}
                </h2>
                <p className="text-xs text-[#5C5268]">
                  {step === 'details'
                    ? 'Enter your details'
                    : step === 'checkout'
                      ? 'Confirm & pay fee'
                      : step === 'awaiting_pin'
                        ? 'Waiting for M-Pesa PIN'
                        : step === 'confirmed'
                          ? 'Completed'
                          : step === 'failed'
                            ? 'Payment failed'
                            : step === 'cancelled'
                              ? 'Cancelled'
                              : 'Timed out'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="w-10 h-10 rounded-full border border-[#E5E0EC] flex items-center justify-center text-[#5C5268] hover:text-[#1C1424] hover:bg-[#FAF9FC] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {(step === 'details' || step === 'checkout') && (
              <div className="rounded-xl bg-[#FAF9FC] border border-[#E5E0EC] p-4 space-y-2 text-sm">
                {intent.type === 'loan' && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#5C5268]">Package</span>
                      <span className="font-semibold text-[#521878]">
                        {intent.calculation.matchedPackage.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#5C5268]">Loan amount</span>
                      <span className="font-bold text-[#1C1424] tabular-nums">
                        {formatKsh(intent.calculation.amount, true)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#5C5268]">
                        Due on {intent.calculation.dueDateFormatted}
                      </span>
                      <span className="font-semibold text-[#1C1424] tabular-nums">
                        {formatKsh(intent.calculation.totalRepayment, true)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#E5E0EC]">
                      <span className="font-semibold text-[#1C1424]">Application fee</span>
                      <span className="font-display text-lg font-bold text-[#521878] tabular-nums">
                        {formatKsh(intent.calculation.feeAmount, true)}
                      </span>
                    </div>
                  </>
                )}

                {intent.type === 'extension' && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#5C5268]">Active loan</span>
                      <span className="font-semibold text-[#1C1424] tabular-nums">
                        {formatKsh(intent.balance, true)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#5C5268]">Extension period</span>
                      <span className="font-semibold text-[#521878]">
                        +{intent.option.days} Days
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#E5E0EC]">
                      <span className="font-semibold text-[#1C1424]">Extension fee</span>
                      <span className="font-display text-lg font-bold text-[#521878] tabular-nums">
                        {formatKsh(intent.extensionFee, true)}
                      </span>
                    </div>
                  </>
                )}

                {intent.type === 'referral' && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#5C5268]">Invitations</span>
                      <span className="font-semibold text-[#1C1424] tabular-nums">
                        {intent.friendCount} friends × KSh 100
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#E5E0EC]">
                      <span className="font-semibold text-[#1C1424]">Payout to M-Pesa</span>
                      <span className="font-display text-lg font-bold text-[#521878] tabular-nums">
                        {formatKsh(intent.bonusAmount, true)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 'details' && (
              <form id="zenka-drawer-form" onSubmit={handleDetailsSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="drawer-full-name"
                    className="block text-xs font-semibold text-[#1C1424] mb-1.5"
                  >
                    Full Legal Name (as on National ID)
                  </label>
                  <input
                    id="drawer-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Wanjiku Kamau"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E5E0EC] bg-white text-base sm:text-sm text-[#1C1424] focus:border-[#521878] focus:ring-2 focus:ring-[#521878]/15 outline-none"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="drawer-mpesa-phone"
                    className="block text-xs font-semibold text-[#1C1424] mb-1.5"
                  >
                    Safaricom M-Pesa Number
                  </label>
                  <input
                    id="drawer-mpesa-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E5E0EC] bg-white text-base sm:text-sm text-[#1C1424] tabular-nums focus:border-[#521878] focus:ring-2 focus:ring-[#521878]/15 outline-none"
                    required
                  />
                </div>

                {intent.type === 'loan' && (
                  <>
                    <div>
                      <label
                        htmlFor="drawer-national-id"
                        className="block text-xs font-semibold text-[#1C1424] mb-1.5"
                      >
                        National ID Number
                      </label>
                      <input
                        id="drawer-national-id"
                        type="text"
                        inputMode="numeric"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="e.g. 34567890"
                        className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E5E0EC] bg-white text-base sm:text-sm text-[#1C1424] tabular-nums focus:border-[#521878] focus:ring-2 focus:ring-[#521878]/15 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="drawer-loan-purpose"
                        className="block text-xs font-semibold text-[#1C1424] mb-1.5"
                      >
                        Loan Purpose
                      </label>
                      <select
                        id="drawer-loan-purpose"
                        value={loanPurpose}
                        onChange={(e) => setLoanPurpose(e.target.value)}
                        className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E5E0EC] bg-white text-base sm:text-sm text-[#1C1424] focus:border-[#521878] focus:ring-2 focus:ring-[#521878]/15 outline-none"
                      >
                        <option value="Working Capital / Biashara">
                          Working Capital / Biashara
                        </option>
                        <option value="Personal & Household">
                          Personal &amp; Household
                        </option>
                        <option value="Education & School Fees">
                          Education &amp; School Fees
                        </option>
                        <option value="Medical & Emergency">
                          Medical &amp; Emergency
                        </option>
                      </select>
                    </div>
                  </>
                )}

                {errorMsg && (
                  <p
                    role="alert"
                    className="text-xs font-medium text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5"
                  >
                    {errorMsg}
                  </p>
                )}
              </form>
            )}

            {step === 'checkout' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E5E0EC] p-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#5C5268]">Applicant</span>
                    <span className="font-semibold text-[#1C1424]">{fullName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#5C5268]">M-Pesa number</span>
                    <span className="font-mono text-xs font-semibold text-[#1C1424]">
                      {normalizedPhone}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#FAF9FC] border border-[#E5E0EC] p-4 flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-[#521878] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#5C5268] leading-relaxed">
                    {intent.type === 'referral'
                      ? 'Confirm below to withdraw your bonus directly to your M-Pesa number.'
                      : `Tap below to receive an M-Pesa payment prompt of ${formatKsh(dueFeeAmount)} on your phone. Keep your screen unlocked to enter your PIN.`}
                  </p>
                </div>

                {errorMsg && (
                  <p
                    role="alert"
                    className="text-xs font-medium text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5"
                  >
                    {errorMsg}
                  </p>
                )}
              </div>
            )}

            {step === 'awaiting_pin' && (
              <div className="rounded-2xl border border-[#E5E0EC] bg-white p-6 sm:p-7 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#521878] text-[#FFD200] flex items-center justify-center mx-auto">
                  <LoaderCircle className="w-7 h-7 animate-spin" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#1C1424]">
                  STK Push Sent
                </h3>
                <p className="text-sm text-[#5C5268] leading-relaxed">
                  An STK push has been sent to{' '}
                  <span className="font-semibold text-[#1C1424] tabular-nums">
                    {maskedPhone || normalizedPhone}
                  </span>
                  . Enter your M-Pesa PIN to complete the transaction of{' '}
                  <span className="font-bold text-[#521878] tabular-nums">
                    {formatKsh(confirmedAmount || dueFeeAmount)}
                  </span>
                  .
                </p>
                <p className="text-xs font-medium text-[#5C5268] tabular-nums">
                  Verifying payment... {secondsRemaining}s remaining
                </p>
                <button
                  type="button"
                  disabled={verifying}
                  onClick={() => void checkStkStatus(checkoutRequestId, sessionToken)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] rounded-full border border-[#521878] text-xs font-semibold text-[#521878] hover:bg-[#521878] hover:text-white transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                  {verifying ? 'Verifying...' : 'Verify Payment'}
                </button>
              </div>
            )}

            {step === 'confirmed' && (
              <div className="rounded-2xl border border-[#E5E0EC] bg-white p-6 sm:p-7 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#FFD200] text-[#521878] flex items-center justify-center mx-auto">
                  <CircleCheck className="w-7 h-7" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#1C1424]">
                  {intent.type === 'referral'
                    ? 'Withdrawal Queued'
                    : 'Transaction Successful'}
                </h3>
                <p className="text-sm text-[#5C5268] leading-relaxed">
                  {intent.type === 'referral'
                    ? `Your M-Pesa bonus payout of ${formatKsh(confirmedAmount)} has been queued.`
                    : `Your payment of ${formatKsh(confirmedAmount || dueFeeAmount)} from ${
                        maskedPhone || normalizedPhone
                      } has been verified and confirmed.`}
                </p>
                {receiptCode && (
                  <p className="text-xs font-mono font-semibold text-[#521878] bg-[#FAF9FC] border border-[#E5E0EC] rounded-lg py-2 px-3 inline-block">
                    M-Pesa Receipt: {receiptCode}
                  </p>
                )}
              </div>
            )}

            {step === 'failed' && (
              <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-6 sm:p-7 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-white border border-[#FECACA] text-[#DC2626] flex items-center justify-center mx-auto">
                  <CircleX className="w-7 h-7" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#1C1424]">
                  Payment Failed
                </h3>
                <p className="text-sm text-[#5C5268] leading-relaxed">
                  {failureReason ||
                    'The M-Pesa transaction could not be completed. No funds were deducted.'}
                </p>
              </div>
            )}

            {step === 'cancelled' && (
              <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-6 sm:p-7 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-white border border-[#FECACA] text-[#DC2626] flex items-center justify-center mx-auto">
                  <CircleX className="w-7 h-7" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#1C1424]">
                  Transaction Cancelled
                </h3>
                <p className="text-sm text-[#5C5268] leading-relaxed">
                  The M-Pesa transaction was cancelled. No amount was deducted from your account.
                </p>
              </div>
            )}

            {step === 'timeout' && (
              <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-6 sm:p-7 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-white border border-[#FDE68A] text-[#D97706] flex items-center justify-center mx-auto">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#1C1424]">
                  Transaction Timed Out
                </h3>
                <p className="text-sm text-[#5C5268] leading-relaxed">
                  We did not receive your M-Pesa PIN confirmation in time. Please try again.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-[#E5E0EC] bg-white sticky bottom-0 flex items-center justify-between gap-3">
          {step === 'details' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-3 rounded-full border border-[#E5E0EC] text-xs font-semibold text-[#5C5268] hover:text-[#1C1424] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="zenka-drawer-form"
                className="flex-1 min-h-[44px] py-3 px-6 rounded-full bg-[#521878] hover:bg-[#3B0F58] text-white text-sm font-bold transition-colors cursor-pointer"
              >
                Continue
              </button>
            </>
          )}

          {step === 'checkout' && (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep('details')}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-3 rounded-full border border-[#E5E0EC] text-xs font-semibold text-[#5C5268] hover:text-[#1C1424] transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleInitiateCheckout}
                className="flex-1 min-h-[44px] py-3 px-6 rounded-full bg-[#521878] hover:bg-[#3B0F58] text-white text-sm font-bold transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
                {submitting
                  ? 'Sending Prompt...'
                  : intent.type === 'referral'
                    ? 'Confirm Withdrawal'
                    : `Pay Fee of ${formatKsh(dueFeeAmount)}`}
              </button>
            </>
          )}

          {step === 'awaiting_pin' && (
            <button
              type="button"
              onClick={handleRetry}
              className="w-full min-h-[44px] py-3 px-6 rounded-full border border-[#E5E0EC] text-xs font-semibold text-[#5C5268] hover:text-[#1C1424] transition-colors cursor-pointer"
            >
              Cancel &amp; Try Different Number
            </button>
          )}

          {(step === 'failed' || step === 'cancelled' || step === 'timeout') && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-3 rounded-full border border-[#E5E0EC] text-xs font-semibold text-[#5C5268] hover:text-[#1C1424] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 min-h-[44px] py-3 px-6 rounded-full bg-[#521878] hover:bg-[#3B0F58] text-white text-sm font-bold transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </>
          )}

          {step === 'confirmed' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] py-3 px-6 rounded-full bg-[#FFD200] hover:bg-[#F2C400] text-[#141212] text-sm font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
