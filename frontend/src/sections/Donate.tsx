import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Check, Copy, Lock } from 'lucide-react';
import { Photo } from '@/components/ui/Photo';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BANK, WHATSAPP_URL } from '@/lib/constants';

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
  const { t } = useTranslation();

  const rows = [
    { key: 'holder', label: t('donate.holder'), value: BANK.holder },
    { key: 'bank', label: t('donate.bank'), value: BANK.bank },
    { key: 'phone', label: t('donate.phone'), value: BANK.phone },
    { key: 'reference', label: t('donate.reference'), value: BANK.reference },
  ];

  return (
    <div className="flex flex-col gap-12">
      <SectionHeader title={t('donate.title')} subtitle={t('donate.subtitle')} />

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_440px] lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="t-body-lg text-negro">{t('donate.lead')}</p>
          <p className="t-heading-md text-negro">{t('donate.thanks')}</p>
          <p className="t-body text-negro">
            <Trans
              i18nKey="donate.whatsapp_info"
              components={{
                wa: (
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="t-body-strong underline underline-offset-2"
                  />
                ),
              }}
            />
          </p>

          <div className="flex flex-col gap-3.5 rounded-card border border-linea bg-blanco p-7">
            <p className="t-eyebrow text-negro">{t('donate.account_eyebrow')}</p>
            {rows.map((row) => (
              <CopyRow key={row.key} label={row.label} value={row.value} />
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-card bg-amarillo px-5 py-4">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-negro" aria-hidden />
            <p className="t-small text-negro">{t('donate.notice')}</p>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-5 rounded-panel border border-linea bg-blanco p-8 shadow-lift lg:w-[440px] lg:justify-self-end">
          <p className="t-heading-card text-negro">{t('donate.qr_title')}</p>
          <Photo
            src="/images/qr-donacion-yape-bcp.jpg"
            alt={t('donate.qr_alt')}
            radius="card"
            className="aspect-square h-auto w-full"
          />
          <p className="t-small text-negro">{t('donate.qr_caption')}</p>
        </div>
      </div>
    </div>
  );
}
