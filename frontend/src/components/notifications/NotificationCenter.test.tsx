import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import { NotificationCenter } from './NotificationCenter';

describe('NotificationCenter', () => {
  it('muestra el contador y marca una notificación como leída al abrirla', () => {
    const onRead = vi.fn();

    renderWithProviders(
      <NotificationCenter
        notifications={[
          {
            id: 'n1',
            signature: 'sig-1',
            title: 'Solicitud aprobada',
            description: 'Tu solicitud de permisos fue aprobada.',
            href: '/permissions/request',
            tone: 'success',
            createdAt: '2026-03-10T12:00:00.000Z',
          },
        ]}
        unreadCount={1}
        isUnread={() => true}
        onRead={onRead}
        onReadAll={vi.fn()}
      />,
      { route: '/' },
    );

    fireEvent.click(screen.getByRole('button', { name: /abrir notificaciones/i }));
    fireEvent.click(screen.getByRole('link', { name: /solicitud aprobada/i }));

    expect(onRead).toHaveBeenCalledWith('sig-1');
  });

  it('permite marcar todas cuando hay elementos', () => {
    const onReadAll = vi.fn();

    renderWithProviders(
      <NotificationCenter
        notifications={[
          {
            id: 'n1',
            signature: 'sig-1',
            title: 'Hay solicitudes pendientes',
            description: '3 solicitudes esperan revisión.',
            href: '/admin/permission-requests',
            tone: 'info',
            createdAt: '2026-03-10T12:00:00.000Z',
          },
        ]}
        unreadCount={1}
        isUnread={() => true}
        onRead={vi.fn()}
        onReadAll={onReadAll}
      />,
      { route: '/' },
    );

    fireEvent.click(screen.getByRole('button', { name: /abrir notificaciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /marcar todas/i }));

    expect(onReadAll).toHaveBeenCalled();
  });
});
