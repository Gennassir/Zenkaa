import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { HeroCalculator } from './components/HeroCalculator';
import { PackagesSection } from './components/PackagesSection';
import { ExtensionsSection } from './components/ExtensionsSection';
import { ReferralsSection } from './components/ReferralsSection';
import { Footer } from './components/Footer';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import {
  calculateLoan,
  type DrawerIntent,
  type ExtensionOption,
  type LoanPackage,
  type LoanTier,
} from './data/zenkaData';

export default function App() {
  const [amount, setAmount] = useState(21000);
  const [termDays, setTermDays] = useState(61);
  const [drawerIntent, setDrawerIntent] = useState<DrawerIntent | null>(null);

  const calculation = useMemo(() => calculateLoan(amount, termDays), [amount, termDays]);

  const handleHeaderApply = () => {
    const packagesEl = document.getElementById('packages');
    if (packagesEl) {
      packagesEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectTier = (tier: LoanTier, pkg: LoanPackage) => {
    const defaultTerm = pkg.supportedTerms[pkg.supportedTerms.length - 1] ?? 61;
    setAmount(tier.principal);
    setTermDays(defaultTerm);
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
      <Header onApplyClick={handleHeaderApply} />

      <main className="flex-1">
        <HeroCalculator
          amount={amount}
          termDays={termDays}
          calculation={calculation}
          onAmountChange={setAmount}
          onTermChange={setTermDays}
          onApply={() => setDrawerIntent({ type: 'loan', calculation })}
        />

        <PackagesSection
          selectedAmount={calculation.amount}
          selectedPackageId={calculation.matchedPackage.id}
          onSelectTier={handleSelectTier}
        />

        <ExtensionsSection onExtendCheckout={handleExtendCheckout} />

        <ReferralsSection onWithdrawBonus={handleWithdrawBonus} />
      </main>

      <Footer />

      <CheckoutDrawer intent={drawerIntent} onClose={() => setDrawerIntent(null)} />
    </div>
  );
}
