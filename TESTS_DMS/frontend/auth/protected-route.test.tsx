import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '../../../frontend/src/auth/ProtectedRoute'

const mocks = vi.hoisted(() => ({
  auth: {
    token: null as string | null,
  },
}))

vi.mock('../../../frontend/src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: mocks.auth.token,
    refreshToken: null,
    isAdmin: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}))

describe('ProtectedRoute external tests', () => {
  beforeEach(() => {
    mocks.auth.token = null
  })

  it('redirects unauthenticated users to /login', () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<div>Privado</div>} />
          </Route>
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('renders nested routes when a token exists', () => {
    mocks.auth.token = 'token-123'

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<div>Privado</div>} />
          </Route>
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Privado')).toBeInTheDocument()
  })
})
