import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { NAV_ITEMS, SECTION_IDS, scrollToSection } from '@/lib/constants';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    setTimeout(() => scrollToSection(id), 100);
  };

  if (!isOpen) return null;

  return (
    <div
      id="mobile-menu"
      ref={menuRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.label')}
      className="fixed inset-0 z-50 bg-crema"
    >
      <div className="flex h-full flex-col p-6">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-crema-tono"
            aria-label={t('nav.closeMenu')}
          >
            <X className="h-6 w-6 text-negro" aria-hidden="true" />
          </button>
          <LanguageToggle />
        </div>

        <nav aria-label={t('nav.label')} className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.labelKey}
              onClick={() => handleNavClick(item.targetId)}
              className="min-h-11 rounded-card px-3 py-3 text-left t-heading-lg text-negro hover:bg-crema-tono"
            >
              {t(item.labelKey)}
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
