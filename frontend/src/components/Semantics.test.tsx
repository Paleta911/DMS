import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import { renderWithProviders } from '../test/test-utils';
import { AccessDenied } from './AccessDenied';
import { EmptyState } from './EmptyState';
import { ThemeToggle } from './ui/ThemeToggle';

describe('Componentes semanticos base', () => {
  it('AccessDenied expone un titulo enlazado semanticamente', () => {
    renderWithProviders(<AccessDenied />);

    const title = screen.getByRole('heading', { name: 'Acceso denegado' });
    expect(title).toHaveAttribute('id', 'access-denied-title');
    expect(title.closest('section')).toHaveAttribute('aria-labelledby', 'access-denied-title');
  });

  it('EmptyState expone un titulo enlazado semanticamente', () => {
    renderWithProviders(
      <EmptyState title="Sin documentos" subtitle="Ajusta filtros o sube un documento." />,
    );

    const title = screen.getByRole('heading', { name: 'Sin documentos' });
    expect(title).toHaveAttribute('id', 'empty-state-title');
    expect(title.closest('section')).toHaveAttribute('aria-labelledby', 'empty-state-title');
  });

  it('ThemeToggle anuncia el cambio de tema y su estado actual', () => {
    renderWithProviders(<ThemeToggle />, {
      wrapper: (children) => <ThemeProvider>{children}</ThemeProvider>,
    });

    const button = screen.getByRole('button', { name: 'Cambiar a modo oscuro' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('Modo oscuro');
  });
});
