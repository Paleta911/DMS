import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthUser } from '../../../frontend/src/types/auth'
import {
  clearAuthStorage,
  clearForbidden,
  clearRefreshToken,
  clearStoredUser,
  clearToken,
  getForbidden,
  getRefreshToken,
  getStoredUser,
  getToken,
  markForbidden,
  setRefreshToken,
  setStoredUser,
  setToken,
} from '../../../frontend/src/auth/storage'
import { decodeJwt } from '../../../frontend/src/utils/jwt'
import { downloadBlob, downloadJson, downloadText } from '../../../frontend/src/utils/download'
import { formatDate } from '../../../frontend/src/utils/date'
import {
  createSavedView,
  loadSavedViewState,
  saveSavedViewState,
} from '../../../frontend/src/utils/savedViews'
import {
  getPermissionRequestDetail,
  getPermissionRequestTypeLabel,
  parsePermissionRequestAreaCodes,
  parsePermissionRequestDetail,
} from '../../../frontend/src/utils/permissionRequests'
import { useDebouncedValue } from '../../../frontend/src/hooks/useDebouncedValue'
import { useSavedViews } from '../../../frontend/src/hooks/useSavedViews'

function DebounceProbe() {
  const [value, setValue] = useState('a')
  const debounced = useDebouncedValue(value, 200)
  return (
    <div>
      <button onClick={() => setValue('b')}>Cambiar</button>
      <span data-testid="debounced">{debounced}</span>
    </div>
  )
}

function SavedViewsProbe() {
  const { initialFilters, views, saveCurrentView, deleteView, rememberLastUsed } = useSavedViews({
    storageKey: 'probe',
    fallback: { q: '' },
  })

  return (
    <div>
      <span data-testid="initial">{initialFilters.q}</span>
      <span data-testid="views">{views.length}</span>
      <button onClick={() => saveCurrentView('Vista', { q: 'uno' })}>Guardar</button>
      <button onClick={() => saveCurrentView('Vista', { q: 'dos' })}>Actualizar</button>
      <button onClick={() => views[0] && deleteView(views[0].id, { q: 'actual' })}>Borrar</button>
      <button onClick={() => rememberLastUsed({ q: 'final' })}>Recordar</button>
    </div>
  )
}

describe('frontend utils and hooks external tests', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('stores and clears auth-related values', () => {
    const user: AuthUser = {
      id: 1,
      email: 'user@bsm.com.mx',
      role: 'user',
      status: 'APPROVED',
      permissions: {
        canAccess: true,
        canRead: true,
        canUpload: false,
        canUploadNewVersion: false,
        canReview: false,
        canApprove: false,
        canDelete: false,
      },
    }

    setToken('token')
    setRefreshToken('refresh')
    setStoredUser(user)
    markForbidden('/documents/10')

    expect(getToken()).toBe('token')
    expect(getRefreshToken()).toBe('refresh')
    expect(getStoredUser()).toMatchObject({ email: 'user@bsm.com.mx' })
    expect(getForbidden()).toMatchObject({ path: '/documents/10' })

    clearToken()
    clearRefreshToken()
    clearStoredUser()
    clearForbidden()
    expect(getToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(getStoredUser()).toBeNull()
    expect(getForbidden()).toBeNull()

    setToken('token')
    setRefreshToken('refresh')
    setStoredUser(user)
    markForbidden('/documents/10')
    clearAuthStorage()
    expect(localStorage.length).toBe(0)
  })

  it('handles invalid localStorage payloads and jwt payloads safely', () => {
    localStorage.setItem('dms_user', '{broken')
    localStorage.setItem('dms_last_forbidden', '{broken')
    expect(getStoredUser()).toBeNull()
    expect(getForbidden()).toBeNull()

    const payload = btoa(JSON.stringify({ sub: 1, email: 'user@bsm.com.mx' }))
    expect(decodeJwt(`x.${payload}.y`)).toMatchObject({ sub: 1, email: 'user@bsm.com.mx' })
    expect(decodeJwt('broken')).toBeNull()
  })

  it('downloads blobs, text and json payloads', () => {
    const createObjectURLMock = vi.fn(() => 'blob:test')
    const revokeObjectURLMock = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURLMock,
      configurable: true,
    })
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectURLMock,
      configurable: true,
    })
    const click = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', {
          value: click,
          configurable: true,
        })
      }
      return element
    }) as typeof document.createElement)
    const removeSpy = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => undefined)

    downloadBlob(new Blob(['demo']), 'demo.txt')
    downloadText('hola', 'demo.txt')
    downloadJson({ ok: true }, 'demo.json')

    expect(createObjectURLMock).toHaveBeenCalledTimes(3)
    expect(click).toHaveBeenCalledTimes(3)
    expect(removeSpy).toHaveBeenCalledTimes(3)
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(3)
  })

  it('formats dates and saved views safely', () => {
    expect(formatDate()).toBe('—')
    expect(formatDate('invalid')).toBe('—')
    expect(formatDate('2026-03-18T15:30:00.000Z')).toMatch(/\d{2}\/\d{2}\/\d{4}/)

    const state = loadSavedViewState('views', { q: '' })
    expect(state).toEqual({ lastUsed: { q: '' }, views: [] })
    saveSavedViewState('views', {
      lastUsed: { q: 'abc' },
      views: [{ id: '1', name: 'Vista', filters: { q: 'abc' }, createdAt: 'now', updatedAt: 'now' }],
    })
    expect(loadSavedViewState('views', { q: '' }).lastUsed).toEqual({ q: 'abc' })
    expect(createSavedView('Demo', { q: '123' })).toMatchObject({ name: 'Demo', filters: { q: '123' } })
  })

  it('parses permission request details and labels', () => {
    expect(parsePermissionRequestDetail('["READ","UPLOAD"]')).toBe('READ, UPLOAD')
    expect(parsePermissionRequestDetail('broken')).toBe('broken')
    expect(parsePermissionRequestAreaCodes('["fa","rc"]')).toEqual(['FA', 'RC'])
    expect(parsePermissionRequestAreaCodes('broken')).toEqual([])
    expect(
      getPermissionRequestDetail({
        requestType: 'AREAS',
        requestedAreaCodes: '["FA"]',
        requestedPermissions: '[]',
      } as any),
    ).toBe('FA')
    expect(getPermissionRequestTypeLabel({ requestType: 'AREAS' } as any)).toBe('Áreas')
    expect(getPermissionRequestTypeLabel({ requestType: 'PERMISSIONS' } as any)).toBe('Permisos')
  })

  it('debounces values before exposing them', async () => {
    vi.useFakeTimers()
    render(<DebounceProbe />)
    expect(screen.getByTestId('debounced').textContent).toBe('a')
    fireEvent.click(screen.getByText('Cambiar'))
    expect(screen.getByTestId('debounced').textContent).toBe('a')
    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByTestId('debounced').textContent).toBe('b')
    vi.useRealTimers()
  })

  it('stores saved views using the hook', async () => {
    render(<SavedViewsProbe />)
    fireEvent.click(screen.getByText('Guardar'))
    expect(screen.getByTestId('views').textContent).toBe('1')
    fireEvent.click(screen.getByText('Actualizar'))
    fireEvent.click(screen.getByText('Recordar'))
    const persisted = JSON.parse(localStorage.getItem('probe') ?? '{}')
    expect(persisted.lastUsed).toEqual({ q: 'final' })
    fireEvent.click(screen.getByText('Borrar'))
    await waitFor(() => expect(screen.getByTestId('views').textContent).toBe('0'))
  })
})
