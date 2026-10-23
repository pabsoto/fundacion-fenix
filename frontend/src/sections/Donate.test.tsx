import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import { Donate } from './Donate';

vi.mock('@/hooks/useInstitutionalContent', () => ({
  useInstitutionalContent: () => ({ text: () => 'Contenido institucional' }),
}));

vi.mock('@/hooks/useWhatsAppContact', () => ({
  useWhatsAppContact: () => ({ data: undefined }),
}));

vi.mock('@/hooks/useDonation', () => ({
  useDonation: () => ({
    data: {
      titular: 'DEMO',
      banco: 'Banco de prueba',
      telefono: '00000000',
      referencia: 'PRUEBA',
      numeroCuenta: null,
      aviso: { es: 'No donar', en: 'Do not donate' },
      qrUrl: 'https://example.test/qr-demo.png',
    },
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: true }));

afterEach(cleanup);

describe('Donate con una configuración DEMO', () => {
  it('muestra el QR advertido y no ofrece copiar datos bancarios', async () => {
    await i18n.changeLanguage('es');
    render(<Donate />);

    expect(screen.getByText('QR DE PRUEBA — NO REALIZAR PAGOS')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Código QR de prueba no válido para realizar pagos' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Copiar/ })).toBeNull();
    expect(screen.queryByText('Banco de prueba')).toBeNull();
  });
});
