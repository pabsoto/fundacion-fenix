import { describe, expect, it } from 'vitest';
import { validarCanal } from './canal-admin';

describe('validarCanal', () => {
  it('exige un enlace https o mailto y limita el texto visible', () => {
    expect(validarCanal({ url: '   ', textoEs: '' })?.url).toBe('Completa este campo.');
    expect(validarCanal({ url: 'http://wa.me/1', textoEs: '' })?.url).toBe(
      'El enlace debe empezar por https:// o mailto:.',
    );
    expect(validarCanal({ url: 'https://wa.me/1', textoEs: 'a'.repeat(201) })?.textoEs).toBe(
      'El texto visible admite hasta 200 caracteres.',
    );
    expect(validarCanal({ url: `https://wa.me/${'a'.repeat(500)}`, textoEs: '' })?.url).toBe(
      'El enlace admite hasta 500 caracteres.',
    );
    expect(validarCanal({ url: 'mailto:hola@fenix.org', textoEs: '' })).toBeNull();
  });
});
