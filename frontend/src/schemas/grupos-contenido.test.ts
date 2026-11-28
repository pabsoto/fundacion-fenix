import { describe, expect, it } from 'vitest';
import { agruparBloques, idGrupoContenido } from './grupos-contenido';

describe('grupos de contenido', () => {
  it('junta los textos en las secciones de la landing, en el orden de la página', () => {
    const grupos = agruparBloques([
      { clave: 'pilar_educacion', orden: 220 },
      { clave: 'programa_intro', orden: 300 },
      { clave: 'pilares_intro', orden: 200 },
      { clave: 'hero_principal', orden: 10 },
      { clave: 'colaborar_donar', orden: 510 },
      { clave: 'resultado_suelto', orden: 1 },
    ]);

    expect(grupos.map((grupo) => grupo.id)).toEqual([
      'inicio',
      'nosotros',
      'programa',
      'colaborar',
      'otros',
    ]);
    expect(grupos[1]?.bloques.map((bloque) => bloque.clave)).toEqual([
      'pilares_intro',
      'pilar_educacion',
    ]);
    expect(idGrupoContenido('financiamiento_intro')).toBe('programa');
    expect(idGrupoContenido('contacto_footer')).toBe('contactos');
  });
});
