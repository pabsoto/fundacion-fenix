export type FormatoExportacion = 'csv' | 'pdf';

/** Contrato de los endpoints de exportación del backend. */
export const exportacionAdmin = {
  campanas: '/admin/campanas/exportar',
  animales: '/admin/animales/exportar',
  parametros: {
    formato: 'formato',
    anio: 'anio',
    mes: 'mes',
    q: 'q',
    adoptado: 'adoptado',
  },
} as const;
