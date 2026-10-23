import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Lock } from 'lucide-react';
import { Photo } from '@/components/ui/Photo';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useInstitutionalContent } from '@/hooks/useInstitutionalContent';
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact';
import { useDonation } from '@/hooks/useDonation';
import { isDemoDonation } from '@/services/donations.service';

function CopyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="t-body-strong text-negro">{label}</p>
      <div className="flex min-h-11 items-center gap-2">
        <p className="t-body text-negro">{value}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-11 w-11 items-center justify-center rounded-btn text-negro"
          aria-label={t('donate.copy', { field: label })}
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? t('donate.copied') : ''}
        </span>
      </div>
    </div>
  );
}

export function Donate() {
  const { t, i18n } = useTranslation();
  const { text } = useInstitutionalContent();
  const { data: whatsapp } = useWhatsAppContact();
  const donationQuery = useDonation();
  const donation = donationQuery.data ?? null;
  const isDemo = donation ? isDemoDonation(donation) : false;
  const canDonate = donation !== null && !isDemo;
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';

  const rows = donation
    ? [
        { key: 'holder', label: t('donate.holder'), value: donation.titular },
        { key: 'bank', label: t('donate.bank'), value: donation.banco },
        { key: 'phone', label: t('donate.phone'), value: donation.telefono },
        ...(donation.numeroCuenta
          ? [{ key: 'account', label: t('donate.account'), value: donation.numeroCuenta }]
          : []),
        { key: 'reference', label: t('donate.reference'), value: donation.referencia },
      ]
    : [];

  const unavailableMessage = donationQuery.isPending
    ? t('donate.loading')
    : donationQuery.isError
      ? t('donate.error')
      : isDemo
        ? t('donate.demo_unavailable')
        : t('donate.unavailable');

  return (
    <div className="flex flex-col gap-12">
      <SectionHeader
        title={t('donate.title')}
        subtitle={text('donaciones_intro', 'titulo')}
      />

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_440px] lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="t-body-lg text-negro">{text('donaciones_intro')}</p>
          <p className="t-heading-md text-negro">{text('donaciones_agradecimiento')}</p>
          {whatsapp && (
            <p className="t-body text-negro">
              {t('donate.whatsapp_info')}{' '}
              <a
                href={whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="t-body-strong underline underline-offset-2"
              >
                {whatsapp.texto[language] ?? t('donate.whatsapp_cta')}
              </a>
            </p>
          )}

          <div className="flex flex-col gap-3.5 rounded-card border border-linea bg-blanco p-7">
            <p className="t-eyebrow text-negro">{t('donate.account_eyebrow')}</p>
            {canDonate ? (
              rows.map((row) => (
                <CopyRow key={row.key} label={row.label} value={row.value} />
              ))
            ) : (
              <p className="t-body text-negro" role="status">{unavailableMessage}</p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-card bg-amarillo px-5 py-4">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-negro" aria-hidden />
            <p className="t-small text-negro">
              {canDonate
                ? donation.aviso[language] ?? t('donate.notice')
                : unavailableMessage}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-5 rounded-panel border border-linea bg-blanco p-8 shadow-lift lg:w-[440px] lg:justify-self-end">
          <p className="t-heading-card text-negro">{t('donate.qr_title')}</p>
          {canDonate && donation.qrUrl ? (
            <Photo
              src={donation.qrUrl}
              alt={t('donate.qr_alt')}
              radius="card"
              className="aspect-square h-auto w-full"
            />
          ) : (
            <div className="flex aspect-square h-auto w-full items-center justify-center rounded-card bg-linea p-8 text-center">
              <p className="t-body text-negro">{unavailableMessage}</p>
            </div>
          )}
          <p className="t-small text-negro">
            {canDonate && donation.qrUrl ? t('donate.qr_caption') : t('donate.qr_unavailable')}
          </p>
        </div>
      </div>
    </div>
  );
}
