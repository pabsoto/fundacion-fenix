import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { SECTION_IDS } from '@/lib/constants';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleNavClick = (id: string) => {
    onClose();
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-crema">
      <div ref={menuRef} className="flex h-full flex-col p-6">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-crema-tono transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-6 w-6 text-negro" />
          </button>
          <LanguageToggle />
        </div>

        <nav className="flex-1 flex flex-col gap-6">
          {Object.entries(SECTION_IDS).map(([key, id]) => (
            <button
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

