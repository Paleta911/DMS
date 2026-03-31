import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../../../frontend/src/auth/AuthContext'

const mocks = vi.hoisted(() => ({
  authLogin: vi.fn(),
  usersMe: vi.fn(),
}))

vi.mock('../../../frontend/src/api/endpoints/auth', () => ({
  authLogin: mocks.authLogin,
}))

vi.mock('../../../frontend/src/api/endpoints/users', () => ({
  usersMe: mocks.usersMe,
}))

function Probe() {
  const { user, token, refreshToken, isAdmin, login, refreshUser } = useAuth()
  return (
    <div>
      <div data-testid="user-email">{user?.email ?? 'none'}</div>
      <div data-testid="token">{token ?? 'none'}</div>
      <div data-testid="refresh-token">{refreshToken ?? 'none'}</div>
      <div data-testid="is-admin">{String(isAdmin)}</div>
      <button type="button" onClick={() => void login('admin@local.com', 'secret')}>
        login
      </button>
      <button type="button" onClick={() => void refreshUser()}>
        refresh
      </button>
    </div>
  )
}

describe('AuthContext external tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.authLogin.mockReset()
    mocks.usersMe.mockReset()
  })

  it('hydrates the authenticated user and stores tokens on login', async () => {
    mocks.authLogin.mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 1, email: 'admin@local.com', role: 'user' },
    })
    mocks.usersMe.mockResolvedValue({
      id: 1,
      email: 'admin@local.com',
      role: 'admin',
      isSuperAdmin: true,
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('access-1')
      expect(screen.getByTestId('refresh-token')).toHaveTextContent('refresh-1')
      expect(screen.getByTestId('user-email')).toHaveTextContent('admin@local.com')
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true')
    })

    expect(window.localStorage.getItem('dms_token')).toBe('access-1')
    expect(window.localStorage.getItem('dms_refresh_token')).toBe('refresh-1')
    expect(window.localStorage.getItem('dms_user')).toContain('admin@local.com')
  })

  it('resolves the user from /users/me when login response does not include user', async () => {
    mocks.authLogin.mockResolvedValue({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      user: null,
    })
    mocks.usersMe.mockResolvedValue({
      id: 2,
      email: 'reviewer@local.com',
      role: 'user',
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('reviewer@local.com')
      expect(screen.getByTestId('token')).toHaveTextContent('access-2')
    })
  })

  it('hydrates automatically from a stored token on mount', async () => {
    window.localStorage.setItem('dms_token', 'stored-token')
    mocks.usersMe.mockResolvedValue({
      id: 5,
      email: 'stored@local.com',
      role: 'user',
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('stored@local.com')
      expect(screen.getByTestId('token')).toHaveTextContent('stored-token')
    })
  })

  it('refreshUser does nothing when there is no token', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))

    await waitFor(() => {
      expect(mocks.usersMe).not.toHaveBeenCalled()
    })
  })
})
