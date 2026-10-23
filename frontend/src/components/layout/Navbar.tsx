import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Logo } from '@/components/ui/Logo';
import { MobileMenu } from './MobileMenu';
import { NAV_ITEMS, SCROLL_SPY_IDS, SECTION_IDS, scrollToSection } from '@/lib/constants';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { cn } from '@/lib/cn';

export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeId = useScrollSpy(SCROLL_SPY_IDS);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const timer = setTimeout(() => scrollToSection(id), 50);
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash]);

  const handleNavClick = (id: string) => {
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    scrollToSection(id);
  };

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-btn focus:bg-negro focus:px-4 focus:py-3 focus:text-crema t-button"
      >
        {t('nav.skip')}
      </a>

      <header className="sticky top-0 z-50 border-b border-linea bg-crema/95 backdrop-blur">
        <nav
          aria-label={t('nav.label')}
          className="mx-auto flex h-[72px] max-w-[1440px] items-center px-6 xl:h-[88px] xl:px-14"
        >
          <div className="flex w-full items-center justify-between gap-4">
            <Logo onNavigate={() => setIsMobileMenuOpen(false)} />

            <div className="hidden items-center gap-1 xl:flex">
              {NAV_ITEMS.map((item) => {
                const isActive = item.matchIds.includes(activeId);
                return (
                  <button
                    type="button"
                    key={item.labelKey}
                    onClick={() => handleNavClick(item.targetId)}
                    aria-current={isActive ? 'location' : undefined}
                    className={cn(
                      'rounded-full px-3.5 py-2 t-nav text-negro transition-colors',
                      isActive ? 'bg-amarillo' : 'hover:bg-crema-tono',
                    )}
                  >
                    {t(item.labelKey)}
                  </button>
                );
              })}
            </div>

            <div className="hidden items-center gap-4 xl:flex">
              <LanguageToggle />
              <Button
                variant="primary"
                size="md"
                onClick={() => handleNavClick(SECTION_IDS.donate)}
              >
                {t('nav.donar')}
              </Button>
            </div>

            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-crema-tono xl:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <Menu className="h-6 w-6 text-negro" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
}
