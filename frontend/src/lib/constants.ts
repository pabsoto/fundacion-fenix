export const SECTION_IDS = {
  home: 'inicio',
  about: 'quienes-somos',
  pillars: 'lo-que-hacemos',
  program: 'nuestro-programa',
  results: 'resultados',
  collaborate: 'como-colaborar',
  donate: 'donar',
  contact: 'contactos',
} as const;

export type NavItem = {
  labelKey: string;
  targetId: string;
  matchIds: readonly string[];
};

export const NAV_ITEMS: readonly NavItem[] = [
  {
    labelKey: 'nav.nosotros',
    targetId: SECTION_IDS.about,
    matchIds: [SECTION_IDS.about, SECTION_IDS.pillars],
  },
  {
    labelKey: 'nav.nuestro_programa',
    targetId: SECTION_IDS.program,
    matchIds: [SECTION_IDS.program],
  },
  {
    labelKey: 'nav.resultados',
    targetId: SECTION_IDS.results,
    matchIds: [SECTION_IDS.results],
  },
  {
    labelKey: 'nav.como_colaborar',
    targetId: SECTION_IDS.collaborate,
    matchIds: [SECTION_IDS.collaborate],
  },
  {
    labelKey: 'nav.contactos',
    targetId: SECTION_IDS.contact,
    matchIds: [SECTION_IDS.contact],
  },
];

export const FOOTER_LINKS: readonly NavItem[] = [
  ...NAV_ITEMS.slice(0, 4),
  {
    labelKey: 'nav.donar',
    targetId: SECTION_IDS.donate,
    matchIds: [SECTION_IDS.donate],
  },
  NAV_ITEMS[4],
];

export const SCROLL_SPY_IDS: readonly string[] = NAV_ITEMS.flatMap((item) => [
  ...item.matchIds,
]);

export function scrollToSection(id: string) {
  if (id === SECTION_IDS.home) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
