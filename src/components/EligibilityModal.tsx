import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CircleCheck, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import {
  normalizeKenyanPhone,
  type ApplicantProfile,
} from '../data/zenkaData';
import { ZenkaLogo } from './ZenkaLogo';

type EligibilityStep = 'form' | 'checking' | 'qualified';

interface EligibilityModalProps {
  open: boolean;
  initialProfile?: ApplicantProfile | null;
  onClose: () => void;
  onQualifiedRedirect: (profile: ApplicantProfile) => void;
}

export function EligibilityModal({
  open,
  initialProfile,
  onClose,
  onQualifiedRedirect,
}: EligibilityModalProps) {
  const [step, setStep] = useState<EligibilityStep>('form');
  const [fullName, setFullName] = useState(initialProfile?.fullName ?? '');
  const [nationalId, setNationalId] = useState(initialProfile?.nationalId ?? '');
  const [phone, setPhone] = useState(initialProfile?.phone ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setStep('form');
      setErrorMsg('');
      if (initialProfile) {
        setFullName(initialProfile.fullName);
        setNationalId(initialProfile.nationalId);
        setPhone(initialProfile.phone);
      }
    }
  }, [open, initialProfile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && step !== 'checking') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, step, onClose]);

  useEffect(() => {
    if (!open || step !== 'checking') return;
    const timer = window.setTimeout(() => {
      setStep('qualified');
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [open, step]);

  useEffect(() => {
    if (!open || step !== 'qualified') return;
    const profile: ApplicantProfile = {
      fullName: fullName.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim(),
    };
    const redirectTimer = window.setTimeout(() => {
      onQualifiedRedirect(profile);
    }, 2000);
    return () => window.clearTimeout(redirectTimer);
  }, [open, step, fullName, nationalId, phone, onQualifiedRedirect]);

  if (!open) {
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }
    if (!/^\d{6,10}$/.test(nationalId.trim())) {
      setErrorMsg('Enter a valid Kenyan National ID (6–10 digits).');
      return;
    }
    if (!normalizeKenyanPhone(phone)) {
      setErrorMsg(
        'Enter a valid Kenyan M-Pesa phone number (e.g. 0712 345 678 or +254 712 345 678).'
      );
      return;
    }

    setStep('checking');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141212]/70 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Zenka Loan Eligibility Check"
      onClick={() => {
        if (step !== 'checking') {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-[#E5E0EC] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-[#E5E0EC] flex items-center justify-between gap-3 bg-[#FAF9FC]">
          <ZenkaLogo tone="dark" />
          {step !== 'checking' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-9 h-9 rounded-full border border-[#E5E0EC] bg-white flex items-center justify-center text-[#5C5268] hover:text-[#1C1424] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#1C1424]">
                Apply for a Zenka Loan
              </h2>
              <p className="text-xs text-[#5C5268] mt-1 leading-relaxed">
                Enter your details below to verify your CRB standing and unlock loan packages up to KSh 200,000.
              </p>
            </div>

            <div>
              <label
                htmlFor="eligibility-full-name"
                className="block text-xs font-semibold text-[#1C1424] mb-1.5"
              >
                Full Legal Name
              </label>
              <input
                id="eligibility-full-name"
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
                htmlFor="eligibility-national-id"
                className="block text-xs font-semibold text-[#1C1424] mb-1.5"
              >
                National ID Number
              </label>
              <input
                id="eligibility-national-id"
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
                htmlFor="eligibility-phone"
                className="block text-xs font-semibold text-[#1C1424] mb-1.5"
              >
                Safaricom M-Pesa Phone Number
              </label>
              <input
                id="eligibility-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E5E0EC] bg-white text-base sm:text-sm text-[#1C1424] tabular-nums focus:border-[#521878] focus:ring-2 focus:ring-[#521878]/15 outline-none"
                required
              />
            </div>

            {errorMsg && (
              <p
                role="alert"
                className="text-xs font-medium text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5"
              >
                {errorMsg}
              </p>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-2.5 rounded-full border border-[#E5E0EC] text-xs font-semibold text-[#5C5268] hover:text-[#1C1424] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[44px] py-3 px-6 rounded-full bg-[#521878] hover:bg-[#3B0F58] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                Check Eligibility
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {step === 'checking' && (
          <div className="p-7 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#521878] text-[#FFD200] flex items-center justify-center mx-auto ring-4 ring-[#FFD200]/25">
              <LoaderCircle className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-[#1C1424]">
                Checking eligibility with CRB
              </h2>
              <p className="text-sm text-[#5C5268] leading-relaxed">
                Verifying National ID <span className="font-semibold text-[#1C1424] tabular-nums">{nationalId}</span> for{' '}
                <span className="font-semibold text-[#1C1424]">{fullName}</span>...
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#521878] bg-[#FAF9FC] border border-[#E5E0EC] rounded-full px-3.5 py-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Encrypted CRB Verification</span>
            </div>
          </div>
        )}

        {step === 'qualified' && (
          <div className="p-7 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#FFD200] text-[#521878] flex items-center justify-center mx-auto ring-4 ring-[#521878]/15">
              <CircleCheck className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1C1424]">
                You qualify to apply for Zenka loan
              </h2>
              <p className="text-sm text-[#5C5268] leading-relaxed">
                Congratulations, <span className="font-semibold text-[#1C1424]">{fullName}</span>! Your ID is eligible for packages up to{' '}
                <span className="font-bold text-[#521878]">KSh 200,000</span> with 6 to 24 month repayment terms.
              </p>
            </div>
            <p className="text-xs text-[#5C5268]">
              Redirecting you to available loan packages...
            </p>
            <button
              type="button"
              onClick={() =>
                onQualifiedRedirect({
                  fullName: fullName.trim(),
                  nationalId: nationalId.trim(),
                  phone: phone.trim(),
                })
              }
              className="w-full min-h-[46px] py-3 px-6 rounded-full bg-[#521878] hover:bg-[#3B0F58] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              View Loan Packages
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
