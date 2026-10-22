import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Logo } from '@/components/ui/Logo';
import { MobileMenu } from './MobileMenu';
import { SECTION_IDS } from '@/lib/constants';
import { useScrollSpy } from '@/hooks/useScrollSpy';

// HU-19 / RNF-02
export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeId = useScrollSpy(Object.values(SECTION_IDS));

  // Si llegamos a "/#seccion" desde otra ruta, hacer scroll a la sección.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const timer = setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }),
      50,
    );
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash]);

  const handleNavClick = (id: string) => {
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-btn focus:bg-negro focus:px-4 focus:py-3 focus:text-crema t-button"
      >
        {t('nav.skip', { defaultValue: 'Saltar al contenido' })}
      </a>

      <header className="sticky top-0 z-50 bg-crema/95 backdrop-blur border-b border-linea">
        <nav
          aria-label={t('nav.label', { defaultValue: 'Principal' })}
          className="mx-auto max-w-[1200px] px-6 lg:px-14 py-5"
        >
          <div className="flex items-center justify-between">
            <Logo />

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {Object.entries(SECTION_IDS).map(([key, id]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleNavClick(id)}
                  aria-current={activeId === id ? 'location' : undefined}
                  className={`px-3.5 py-2.5 rounded-full t-nav transition-colors ${
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
              type="button"
              className="lg:hidden p-2.5 rounded-full hover:bg-crema-tono transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label={t('nav.openMenu', { defaultValue: 'Abrir menú' })}
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
