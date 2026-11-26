import { UnsupportedMediaTypeException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { crearJpg, crearPng, crearWebp } from '../../../test/utils/imagenes.js';
import { leerDimensionesFoto } from './dimensiones-foto.js';

describe('leerDimensionesFoto', () => {
  it.each([
    ['JPG', crearJpg(1600, 900)],
    ['PNG', crearPng(1600, 900)],
    ['WebP', crearWebp(1600, 900)],
  ])('lee el ancho y el alto de un %s', (_formato, contenido) => {
    expect(leerDimensionesFoto(contenido)).toEqual({ ancho: 1600, alto: 900 });
  });

  it.each([1, 2, 3, 4])(
    'conserva las medidas con la orientación EXIF %i',
    (orientacion) => {
      expect(leerDimensionesFoto(crearJpg(1600, 900, orientacion))).toEqual({
        ancho: 1600,
        alto: 900,
      });
    },
  );

  it.each([5, 6, 7, 8])(
    'intercambia las medidas con la orientación EXIF %i',
    (orientacion) => {
      expect(leerDimensionesFoto(crearJpg(1600, 900, orientacion))).toEqual({
        ancho: 900,
        alto: 1600,
      });
    },
  );

  it.each([
    ['un JPG truncado', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
    ['un PNG sin dimensiones', crearPng(0, 0)],
    ['un archivo que no es imagen', Buffer.from('texto plano')],
  ])('rechaza %s (415)', (_caso, contenido) => {
    expect(() => leerDimensionesFoto(contenido)).toThrow(
      UnsupportedMediaTypeException,
    );
  });
});
