import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastProvider';

function Trigger() {
  const { notify } = useToast();
  return (
    <button type="button" onClick={() => notify('Operación completada', 'success')}>
      Lanzar
    </button>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('cierra automáticamente una notificación después del tiempo configurado', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lanzar' }));
    expect(screen.getByText('Operación completada')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Operación completada')).not.toBeInTheDocument();
  });

  it('permite cerrar una notificación manualmente', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lanzar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }));

    expect(screen.queryByText('Operación completada')).not.toBeInTheDocument();
  });
});
