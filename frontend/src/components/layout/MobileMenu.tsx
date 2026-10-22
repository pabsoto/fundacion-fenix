import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { SECTION_IDS } from '@/lib/constants';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// HU-19 / RNF-02: diálogo accesible con foco atrapado y devuelto al cerrar.
export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !menuRef.current) return;
      const items = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [isOpen]);

  const handleNavClick = (id: string) => {
    onClose();
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div
      id="mobile-menu"
      ref={menuRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.label', { defaultValue: 'Principal' })}
      className="fixed inset-0 z-50 bg-crema"
    >
      <div className="flex h-full flex-col p-6">
        <div className="flex justify-between items-center mb-8">
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-crema-tono transition-colors"
            aria-label={t('nav.closeMenu', { defaultValue: 'Cerrar menú' })}
          >
            <X className="h-6 w-6 text-negro" aria-hidden="true" />
          </button>
          <LanguageToggle />
        </div>

        <nav
          aria-label={t('nav.label', { defaultValue: 'Principal' })}
          className="flex-1 flex flex-col gap-6 overflow-y-auto"
        >
          {Object.entries(SECTION_IDS).map(([key, id]) => (
            <button
              type="button"
              key={key}
              onClick={() => handleNavClick(id)}
              className="text-left t-heading-lg text-negro hover:text-naranja transition-colors"
            >
              {t(`nav.${key}`)}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => handleNavClick(SECTION_IDS.donate)}
          >
            {t('nav.donar')}
          </Button>
        </div>
      </div>
    </div>
  );
}
