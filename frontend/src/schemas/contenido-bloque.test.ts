import { describe, expect, it } from 'vitest';
import { bloqueMuestraImagen, validarBloque } from './contenido-bloque';

const completo = {
  tituloEs: 'Título',
  tituloEn: 'Title',
  textoEs: 'Texto',
  textoEn: 'Text',
  visible: true,
};

describe('validarBloque', () => {
  it('exige título y texto en los dos idiomas', () => {
    const errores = validarBloque({ ...completo, tituloEs: '  ', textoEn: '' });
    expect(errores?.tituloEs).toBe('Completa este campo.');
    expect(errores?.textoEn).toBe('Completa este campo.');
    expect(errores?.tituloEn).toBeUndefined();
  });

  it('rechaza textos más largos que el DTO', () => {
    const errores = validarBloque({
      ...completo,
      tituloEs: 'a'.repeat(301),
      textoEs: 'b'.repeat(4001),
    });
    expect(errores?.tituloEs).toBe('El título admite hasta 300 caracteres.');
    expect(errores?.textoEs).toBe('El texto admite hasta 4000 caracteres.');
  });

  it('acepta un bloque completo', () => {
    expect(validarBloque(completo)).toBeNull();
  });

  it('muestra imagen en los bloques que la landing ya pinta, o si hay URL', () => {
    expect(bloqueMuestraImagen({ clave: 'hero_principal', imagenUrl: null })).toBe(true);
    expect(bloqueMuestraImagen({ clave: 'programa_intro', imagenUrl: null })).toBe(false);
    expect(bloqueMuestraImagen({ clave: 'programa_intro', imagenUrl: 'https://cdn.test/a.jpg' })).toBe(
      true,
    );
  });
});
