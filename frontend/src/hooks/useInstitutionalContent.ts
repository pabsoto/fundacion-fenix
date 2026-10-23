import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  getInstitutionalContent,
  type InstitutionalContent,
} from '@/services/institutional.service';

type ContentField = 'titulo' | 'descripcion';

export function useInstitutionalContent() {
  const { i18n } = useTranslation();
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
    return byKey.get(key)?.[field][language] ?? '';
  }

  function entry(key: string): InstitutionalContent | undefined {
    return byKey.get(key);
  }

  return { ...query, text, entry, language };
}
