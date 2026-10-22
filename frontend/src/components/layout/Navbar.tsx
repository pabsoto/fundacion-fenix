import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Logo } from '@/components/ui/Logo';
import { MobileMenu } from './MobileMenu';
import { SECTION_IDS } from '@/lib/constants';
import { useScrollSpy } from '@/hooks/useScrollSpy';

export function Navbar() {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeId = useScrollSpy(Object.values(SECTION_IDS));

  const handleNavClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-crema/95 backdrop-blur border-b border-linea">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-14 py-5">
          <div className="flex items-center justify-between">
            <Logo />

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {Object.entries(SECTION_IDS).map(([key, id]) => (
                <button
                  key={key}
                  onClick={() => handleNavClick(id)}
                  className={`px-3.5 py-1.5 rounded-full t-nav transition-colors ${
                    activeId === id ? 'bg-amarillo text-negro' : 'text-negro hover:bg-crema-tono'
                  }`}
                >
                  {t(`nav.${key}`)}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <LanguageToggle />
              <Button
                variant="primary"
                size="md"
                onClick={() => handleNavClick(SECTION_IDS.donate)}
              >
                {t('nav.donar')}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-full hover:bg-crema-tono transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6 text-negro" />
            </button>
          </div>
        </div>
      </nav>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
}

