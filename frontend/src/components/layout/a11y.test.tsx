import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import '@/i18n';
import { syncHtmlLang } from '@/i18n/syncHtmlLang';
import { MobileMenu } from './MobileMenu';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

afterEach(cleanup);

function renderMenu(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <MobileMenu isOpen onClose={onClose} />
    </MemoryRouter>,
  );
  return onClose;
}

describe('HU-19 / RNF-02 accesibilidad', () => {
  it('MobileMenu es un diálogo modal etiquetado', () => {
    renderMenu();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBeTruthy();
  });

  it('MobileMenu mueve el foco al botón cerrar al abrir', () => {
    renderMenu();
    expect(document.activeElement).toBe(screen.getAllByRole('button')[0]);
  });

  it('Escape cierra el menú', () => {
    const onClose = renderMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Tab en el último elemento vuelve al primero (sin trampa)', () => {
    renderMenu();
    const buttons = screen.getAllByRole('button');
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('LanguageToggle expone el idioma activo con aria-pressed', async () => {
    await i18n.changeLanguage('es');
    render(<LanguageToggle />);
    expect(screen.getByRole('group')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Español' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('<html lang> sigue al idioma activo', async () => {
    syncHtmlLang();
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    await i18n.changeLanguage('es');
    expect(document.documentElement.lang).toBe('es');
  });
});
