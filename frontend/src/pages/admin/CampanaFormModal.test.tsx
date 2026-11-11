import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CampanaFormModal } from '@/pages/admin/CampanaFormModal';
import { validarCampana, type CampanaFormulario } from '@/schemas/campana';

// DEMO: el formulario se prueba con los servicios simulados.
vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: true }));

afterEach(() => {
  cleanup();
});

const base: CampanaFormulario = {
  titulo: 'Jornada nueva',
  lugar: '',
  fecha: '',
  descripcion: '',
  publicada: false,
  perrosMachos: '',
  perrosHembras: '',
  gatosMachos: '',
  gatosHembras: '',
  fotos: [],
};

describe('validarCampana y el estado', () => {
  it('permite un borrador sin lugar ni fecha', () => {
    const resultado = validarCampana(base);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.datos).toMatchObject({ estado: 'borrador', lugar: null, fecha: null });
    }
  });

  it('exige lugar y fecha para publicar', () => {
    const resultado = validarCampana({ ...base, publicada: true });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.errores.lugar).toBeTruthy();
      expect(resultado.errores.fecha).toBeTruthy();
    }
  });
});

describe('CampanaFormModal', () => {
  it('publica por defecto y al apagar el interruptor la fecha pasa a ser opcional', () => {
    render(<CampanaFormModal campana={null} onCerrar={() => undefined} onGuardada={() => undefined} />);

    const interruptor = screen.getByRole('switch', { name: /Publicada en el sitio/ });
    expect(interruptor.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Fecha *')).toBeTruthy();

    fireEvent.click(interruptor);

    expect(interruptor.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByLabelText('Fecha (opcional)')).toBeTruthy();
  });
});
