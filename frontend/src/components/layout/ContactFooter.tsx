import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import {
  FacebookIcon,
  FlameIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from '@/components/ui/icons';
import { SECTION_IDS, SOCIAL, WHATSAPP_URL } from '@/lib/constants';

const FOOTER_LINKS = [
  { id: SECTION_IDS.home, navKey: 'inicio' },
  { id: SECTION_IDS.about, navKey: 'quienes_somos' },
  { id: SECTION_IDS.pillars, navKey: 'lo_que_hacemos' },
  { id: SECTION_IDS.program, navKey: 'nuestro_programa' },
  { id: SECTION_IDS.results, navKey: 'resultados' },
  { id: SECTION_IDS.collaborate, navKey: 'como_colaborar' },
  { id: SECTION_IDS.donate, navKey: 'donar' },
  { id: SECTION_IDS.contact, navKey: 'contactos' },
] as const;

const socialBtn =
  'flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-negro bg-crema text-negro';

export function ContactFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-amarillo">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-14 px-6 pb-12 pt-24 lg:px-8">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:gap-20">
          <div className="flex min-w-0 flex-1 flex-col gap-7">
            <h2 className="t-section text-negro">{t('footer.title')}</h2>
            <p className="t-heading-md text-negro">{t('footer.text')}</p>

            <div className="flex gap-4">
              <a
                href={SOCIAL.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.facebook')}
                className={socialBtn}
              >
                <FacebookIcon className="h-[26px] w-[26px]" />
              </a>
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.instagram')}
                className={socialBtn}
              >
                <InstagramIcon className="h-[26px] w-[26px]" />
              </a>
              <a
                href={SOCIAL.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.tiktok')}
                className={socialBtn}
              >
                <TikTokIcon className="h-[26px] w-[26px]" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.whatsapp')}
                className={socialBtn}
              >
                <WhatsAppIcon className="h-[26px] w-[26px]" />
              </a>
            </div>

            <a
              href={`mailto:${SOCIAL.email}`}
              className="inline-flex items-center gap-3 text-negro"
            >
              <Mail className="h-6 w-6 shrink-0" aria-hidden />
              <span className="t-body-lg underline underline-offset-2">{SOCIAL.email}</span>
            </a>
          </div>

          {/* Provisional: sustituir por el logo oficial cuando esté listo. */}
          <div className="mx-auto flex size-[220px] shrink-0 flex-col items-center justify-center gap-3 rounded-full border-2 border-negro bg-crema sm:size-[300px] lg:mx-0">
            <FlameIcon className="h-[72px] w-[72px] sm:h-[120px] sm:w-[120px]" />
            <p className="t-heading-card text-negro">{t('footer.brand')}</p>
            <p className="t-eyebrow text-negro">{t('footer.brand_sub')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-linea pt-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="t-small text-negro">{t('footer.copyright')}</p>
          <nav aria-label={t('nav.label')} className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="t-small text-negro"
              >
                {t(`nav.${link.navKey}`)}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
