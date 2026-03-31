import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('expone un estado accesible con etiqueta por defecto', () => {
    renderWithProviders(<Spinner />);

    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
  });

  it('permite personalizar la etiqueta accesible', () => {
    renderWithProviders(<Spinner label="Cargando auditoría" />);

    expect(screen.getByRole('status', { name: 'Cargando auditoría' })).toBeInTheDocument();
  });
});
