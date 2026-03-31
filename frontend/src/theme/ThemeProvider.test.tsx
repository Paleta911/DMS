import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { renderWithProviders } from '../test/test-utils';

function ThemeProbe() {
  const { theme } = useTheme();
  return <div data-testid="theme-probe">{theme}</div>;
}

describe('ThemeProvider', () => {
  it('inicializa en modo claro por defecto', () => {
    window.localStorage.removeItem('dms-theme');

    renderWithProviders(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-probe')).toHaveTextContent('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('dms-theme')).toBe('light');
  });

  it('recupera el tema guardado y actualiza dataset/colorScheme', () => {
    window.localStorage.setItem('dms-theme', 'dark');

    renderWithProviders(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-probe')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('ThemeToggle cambia entre modo oscuro y claro y persiste el cambio', () => {
    window.localStorage.removeItem('dms-theme');

    renderWithProviders(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeProbe />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button', { name: 'Cambiar a modo oscuro' });
    expect(button).toHaveTextContent('Modo oscuro');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Cambiar a modo claro' })).toHaveTextContent(
      'Modo claro',
    );
    expect(screen.getByTestId('theme-probe')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('dms-theme')).toBe('dark');
  });
});
