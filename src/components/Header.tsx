import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ZenkaLogo } from './ZenkaLogo';

const NAV_LINKS = [
  { label: 'Calculator', href: '#calculator' },
  { label: 'Packages', href: '#packages' },
  { label: 'Extensions', href: '#extensions' },
  { label: 'Referrals', href: '#referrals' },
];

interface HeaderProps {
  onApplyClick: () => void;
}

export function Header({ onApplyClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E5E0EC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <a
          href="#top"
          className="whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#521878] rounded-md"
        >
          <ZenkaLogo tone="dark" />
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5C5268]"
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap shrink-0 py-1 hover:text-[#521878] hover:underline underline-offset-8 decoration-2 decoration-[#FFD200] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#521878]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onApplyClick}
            className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#521878] hover:bg-[#3B0F58] rounded-full transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#521878]"
          >
            Apply Now
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-[#1C1424] hover:bg-[#FAF9FC] transition-colors cursor-pointer"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-b border-[#E5E0EC] px-4 py-4 space-y-3 shadow-sm">
          <nav aria-label="Mobile navigation" className="flex flex-col space-y-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="min-h-[44px] flex items-center px-2 rounded-lg text-sm font-medium text-[#1C1424] hover:text-[#521878] hover:bg-[#FAF9FC] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onApplyClick();
            }}
            className="w-full min-h-[44px] py-3 text-sm font-semibold text-white bg-[#521878] hover:bg-[#3B0F58] rounded-full transition-colors cursor-pointer"
          >
            Apply Now
          </button>
        </div>
      )}
    </header>
  );
}
