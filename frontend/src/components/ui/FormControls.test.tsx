import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { NoticeBanner } from './NoticeBanner';

describe('Form controls accessibility', () => {
  it('vincula el mensaje de error con el input', () => {
    render(<Input label="Correo" error="Correo inválido" />);

    const input = screen.getByRole('textbox', { name: 'Correo' });
    const error = screen.getByText('Correo inválido');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('vincula el mensaje de error con el select y el textarea', () => {
    render(
      <>
        <Select label="Rol" error="Rol requerido" defaultValue="">
          <option value="">Selecciona</option>
          <option value="admin">Administrador</option>
        </Select>
        <Textarea label="Comentario" error="Comentario requerido" />
      </>,
    );

    const select = screen.getByRole('combobox', { name: 'Rol' });
    const selectError = screen.getByText('Rol requerido');
    const textarea = screen.getByRole('textbox', { name: 'Comentario' });
    const textareaError = screen.getByText('Comentario requerido');

    expect(select).toHaveAttribute('aria-describedby', selectError.id);
    expect(textarea).toHaveAttribute('aria-describedby', textareaError.id);
  });

  it('expone banners con role accesible según severidad', () => {
    const { rerender } = render(<NoticeBanner variant="info">Información</NoticeBanner>);

    expect(screen.getByRole('status')).toHaveTextContent('Información');

    rerender(<NoticeBanner variant="error">Error crítico</NoticeBanner>);

    expect(screen.getByRole('alert')).toHaveTextContent('Error crítico');
  });
});
