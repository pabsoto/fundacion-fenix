import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Providers } from '@/app/providers';
import { routes } from '@/app/routes';
import {
  WHATSAPP_MESSAGE,
  WHATSAPP_PHONE,
  WHATSAPP_URL,
} from '@/lib/constants';
import { WhatsAppFloatingButton } from './WhatsAppFloatingButton';

const ariaLabel = 'Contactar a Fundación FÉNIX LPB por WhatsApp';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('WhatsAppFloatingButton', () => {
  it('renderiza el enlace wa.me configurado con destino y accesibilidad', () => {
    render(<WhatsAppFloatingButton />);

    const link = screen.getByRole('link', { name: ariaLabel });

    const expectedHref = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    expect(WHATSAPP_URL).toBe(expectedHref);
    expect(link.getAttribute('href')).toBe(expectedHref);
    expect(WHATSAPP_PHONE).toMatch(/^\d+$/);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.classList.contains('wa-float')).toBe(true);
    expect(link.querySelector('.wa-float__icon')).not.toBeNull();
    expect(link.querySelector('.wa-float__tooltip')?.textContent).toBe(
      '¿Hablamos?',
    );
  });

  it.each([
    ['/', true],
    ['/unrecognized-public-route', true],
    ['/admin/login', false],
    ['/admin', false],
  ])('visibilidad en la ruta %s', (path, shouldBeVisible) => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const router = createMemoryRouter(routes, {
      initialEntries: [path],
    });

    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    );

    expect(
      screen.queryByRole('link', { name: ariaLabel }) !== null,
    ).toBe(shouldBeVisible);
  });
});
