/**
 * Contrato del CSV que ya expone el backend.
 * TODO(backend): confirmar con el compañero la URL, los nombres de estos
 * parámetros y el formato de la respuesta (tipo, Content-Disposition y errores)
 * antes de dar la exportación por cerrada. No crear el endpoint desde el panel.
 */
export const EXPORT_PDF_ENABLED = false;

export const exportacionAdmin = {
  campanas: '/admin/campanas/exportar',
  animales: '/admin/animales/exportar',
  formatoCsv: 'csv',
  parametros: {
    formato: 'formato',
    anio: 'anio',
    mes: 'mes',
    q: 'q',
    adoptado: 'adoptado',
  },
} as const;
