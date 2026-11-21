import { useCallback, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { HeroCalculator } from './components/HeroCalculator';
import { PackagesSection } from './components/PackagesSection';
import { ExtensionsSection } from './components/ExtensionsSection';
import { ReferralsSection } from './components/ReferralsSection';
import { Footer } from './components/Footer';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { EligibilityModal } from './components/EligibilityModal';
import {
  calculateLoan,
  type ApplicantProfile,
  type DrawerIntent,
  type ExtensionOption,
  type LoanPackage,
  type LoanTier,
} from './data/zenkaData';

export default function App() {
  const [amount, setAmount] = useState(30000);
  const [termMonths, setTermMonths] = useState(24);
  const [drawerIntent, setDrawerIntent] = useState<DrawerIntent | null>(null);
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const [verifiedApplicant, setVerifiedApplicant] = useState<ApplicantProfile | null>(null);

  const calculation = useMemo(
    () => calculateLoan(amount, termMonths),
    [amount, termMonths]
  );

  const handleOpenEligibility = () => {
    setEligibilityOpen(true);
  };

  const handleQualifiedRedirect = useCallback((profile: ApplicantProfile) => {
    setVerifiedApplicant(profile);
    setEligibilityOpen(false);
    window.setTimeout(() => {
      const packagesEl = document.getElementById('packages');
      if (packagesEl) {
        packagesEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  }, []);

  const handleSelectTier = (tier: LoanTier, pkg: LoanPackage) => {
    const defaultTerm = pkg.supportedTerms[pkg.supportedTerms.length - 1] ?? 24;
    setAmount(tier.principal);
    setTermMonths(defaultTerm);
    const nextCalc = calculateLoan(tier.principal, defaultTerm);
    setDrawerIntent({ type: 'loan', calculation: nextCalc });
  };

  const handleExtendCheckout = (
    balance: number,
    option: ExtensionOption,
    extensionFee: number
  ) => {
    setDrawerIntent({ type: 'extension', balance, option, extensionFee });
  };

  const handleWithdrawBonus = (bonusAmount: number, friendCount: number) => {
    setDrawerIntent({ type: 'referral', bonusAmount, friendCount });
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAF9FC] text-[#1C1424]">
      <Header onApplyClick={handleOpenEligibility} />

      <main className="flex-1">
        <HeroCalculator
          amount={amount}
          termMonths={termMonths}
          calculation={calculation}
          onAmountChange={setAmount}
          onTermChange={setTermMonths}
          onApplyLoan={handleOpenEligibility}
          onProceedToCheckout={() => {
            if (verifiedApplicant) {
              setDrawerIntent({ type: 'loan', calculation });
            } else {
              handleOpenEligibility();
            }
          }}
        />

        <PackagesSection
          selectedAmount={calculation.amount}
          selectedPackageId={calculation.matchedPackage.id}
          verifiedApplicant={verifiedApplicant}
          onSelectTier={handleSelectTier}
        />

        <ExtensionsSection onExtendCheckout={handleExtendCheckout} />

        <ReferralsSection onWithdrawBonus={handleWithdrawBonus} />
      </main>

      <Footer />

      <EligibilityModal
        open={eligibilityOpen}
        initialProfile={verifiedApplicant}
        onClose={() => setEligibilityOpen(false)}
        onQualifiedRedirect={handleQualifiedRedirect}
      />

      <CheckoutDrawer
        intent={drawerIntent}
        applicantProfile={verifiedApplicant}
        onClose={() => setDrawerIntent(null)}
      />
    </div>
  );
}
