import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  getInstitutionalContent,
  type InstitutionalContent,
} from '@/services/institutional.service';

type ContentField = 'titulo' | 'descripcion';
type FallbackTranslation = string | string[];

const fallbackKeys: Record<
  string,
  Partial<Record<ContentField, FallbackTranslation>>
> = {
  hero_principal: {
    titulo: ['hero.title_line1', 'hero.title_line2', 'hero.title_line3'],
    descripcion: 'hero.subtitle',
  },
  hero_contexto: {
    titulo: 'hero.chip',
    descripcion: ['hero.pill_1', 'hero.pill_2'],
  },
  estadistica_total_etiqueta: { descripcion: 'stats.label1' },
  estadistica_gratuidad: {
    titulo: 'stats.stat2',
    descripcion: 'stats.label2',
  },
  estadistica_fundacion: {
    titulo: 'stats.stat3',
    descripcion: 'stats.label3',
  },
  estadistica_pilares: {
    titulo: 'stats.stat4',
    descripcion: 'stats.label4',
  },
  quienes_somos_encabezado: {
    titulo: 'about.title',
    descripcion: 'about.eyebrow',
  },
  quienes_somos_fundadora: { titulo: 'about.founder_pill' },
  quienes_somos_intro: {
    titulo: 'about.lead',
    descripcion: 'about.text',
  },
  quienes_somos_fenix: {
    titulo: 'about.phoenix_eyebrow',
    descripcion: 'about.phoenix_text',
  },
  pilares_intro: {
    titulo: 'pillars.title',
    descripcion: 'pillars.subtitle',
  },
  pilar_rehabilitacion: {
    titulo: 'pillars.pilar1_title',
    descripcion: 'pillars.pilar1_text',
  },
  pilar_educacion: {
    titulo: 'pillars.pilar2_title',
    descripcion: 'pillars.pilar2_text',
  },
  pilar_esterilizacion: {
    titulo: 'pillars.pilar3_title',
    descripcion: 'pillars.pilar3_text',
  },
  pilares_futuro: { descripcion: 'pillars.future_text' },
  programa_encabezado: {
    titulo: 'program.title',
    descripcion: 'program.motto',
  },
  programa_intro: { descripcion: 'program.paragraph1' },
  programa_alcance: { descripcion: 'program.paragraph2' },
  programa_igualdad: { descripcion: 'program.highlight_box' },
  programa_comunidades: { descripcion: 'program.paragraph3' },
  programa_gratuidad: {
    titulo: 'program.card_title',
    descripcion: 'program.card_subtitle',
  },
  financiamiento_intro: {
    titulo: 'financing.title',
    descripcion: 'financing.paragraph1',
  },
  financiamiento_impacto: { descripcion: 'financing.paragraph2' },
  financiamiento_llamado: { descripcion: 'financing.paragraph3' },
  resultados_intro: {
    titulo: 'results.title',
    descripcion: 'results.subtitle',
  },
  colaborar_intro: {
    titulo: 'collaborate.title',
    descripcion: 'collaborate.subtitle',
  },
  colaborar_donar: {
    titulo: 'collaborate.donate_title',
    descripcion: 'collaborate.donate_text',
  },
  colaborar_apadrinar: {
    titulo: 'collaborate.sponsor_title',
    descripcion: 'collaborate.sponsor_text',
  },
  colaborar_adoptar: {
    titulo: 'collaborate.adopt_title',
    descripcion: 'collaborate.adopt_text',
  },
  donaciones_intro: {
    titulo: 'donate.subtitle',
    descripcion: 'donate.lead',
  },
  donaciones_agradecimiento: { descripcion: 'donate.thanks' },
  contacto_footer: {
    titulo: 'footer.title',
    descripcion: 'footer.text',
  },
};

export function useInstitutionalContent() {
  const { i18n, t } = useTranslation();
  const query = useQuery({
    queryKey: ['public-institutional-content'],
    queryFn: getInstitutionalContent,
  });
  const byKey = useMemo(
    () => new Map((query.data ?? []).map((entry) => [entry.clave, entry])),
    [query.data],
  );
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';

  function text(key: string, field: ContentField = 'descripcion'): string {
    const apiText = byKey.get(key)?.[field][language];
    if (apiText != null) return apiText;

    const fallbackKey = fallbackKeys[key]?.[field];
    return Array.isArray(fallbackKey)
      ? fallbackKey.map((translationKey) => t(translationKey)).join('\n')
      : fallbackKey
        ? t(fallbackKey)
        : '';
  }

  function entry(key: string): InstitutionalContent | undefined {
    return byKey.get(key);
  }

  return { ...query, text, entry, language };
}
