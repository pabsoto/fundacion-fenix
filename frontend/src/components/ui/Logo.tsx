import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { SECTION_IDS, scrollToSection } from '@/lib/constants';

interface LogoProps {
  className?: string;
  onNavigate?: () => void;
}

export function Logo({ className, onNavigate }: LogoProps) {
  const { t } = useTranslation();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onNavigate?.();
    scrollToSection(SECTION_IDS.home);
  }

  return (
    <a
      href={`#${SECTION_IDS.home}`}
      aria-label={t('nav.goHome')}
      onClick={handleClick}
      className={cn('flex shrink-0 items-center gap-3', className)}
    >
      <img
        src="/images/logo-fundacion-fenix.svg"
        alt=""
        aria-hidden="true"
        width={48}
        height={48}
        className="h-11 w-11 shrink-0 object-contain lg:h-12 lg:w-12"
      />
      <span className="whitespace-nowrap">
        <span className="block t-heading-card text-negro">{t('logo.name')}</span>
        <span className="block t-eyebrow text-negro">{t('logo.sub')}</span>
      </span>
    </a>
  );
}
