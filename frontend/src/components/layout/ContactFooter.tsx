import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import {
  FacebookIcon,
  FlameIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from '@/components/ui/icons';
import { FOOTER_LINKS } from '@/lib/constants';
import { useInstitutionalContent } from '@/hooks/useInstitutionalContent';
import { usePublicContacts } from '@/hooks/usePublicContacts';
import type { ContactChannelType } from '@/services/contacts.service';

const socialBtn =
  'flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-negro bg-crema text-negro';

export function ContactFooter() {
  const { t } = useTranslation();
  const { text } = useInstitutionalContent();
  const { contacts } = usePublicContacts();
  const socialIcons: Partial<Record<ContactChannelType, typeof FacebookIcon>> = {
    facebook: FacebookIcon,
    instagram: InstagramIcon,
    tiktok: TikTokIcon,
    whatsapp: WhatsAppIcon,
  };
  const email = contacts.find((contact) => contact.tipo === 'email');
  const socialContacts = contacts.filter((contact) => contact.tipo !== 'email');

  return (
    <footer className="bg-amarillo">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-14 px-6 pb-12 pt-24 lg:px-8">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:gap-20">
          <div className="flex min-w-0 flex-1 flex-col gap-7">
            <h2 className="t-section text-negro">{text('contacto_footer', 'titulo')}</h2>
            <p className="t-heading-md text-negro">{text('contacto_footer')}</p>

            <div className="flex gap-4">
              {socialContacts.map((contact) => {
                const Icon = socialIcons[contact.tipo];
                if (!Icon) return null;
                return (
                  <a
                    key={contact.tipo}
                    href={contact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t(`footer.${contact.tipo}`)}
                    className={socialBtn}
                  >
                    <Icon className="h-[26px] w-[26px]" />
                  </a>
                );
              })}
            </div>

            {email && (
              <a href={email.url} className="inline-flex items-center gap-3 text-negro">
                <Mail className="h-6 w-6 shrink-0" aria-hidden />
                <span className="t-body-lg underline underline-offset-2">
                  {email.url.replace(/^mailto:/, '')}
                </span>
              </a>
            )}
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
                key={link.labelKey}
                href={`#${link.targetId}`}
                className="t-small min-h-11 inline-flex items-center text-negro"
              >
                {t(link.labelKey)}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
