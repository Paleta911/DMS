import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../frontend/src/test/test-utils'
import type { ReactNode } from 'react'
import { ThemeProvider } from '../../../frontend/src/theme/ThemeProvider'
import LoginPage from '../../../frontend/src/pages/LoginPage'
import RegisterPage from '../../../frontend/src/pages/RegisterPage'
import VerifyEmailPage from '../../../frontend/src/pages/VerifyEmailPage'
import ForbiddenPage from '../../../frontend/src/pages/ForbiddenPage'

const notify = vi.fn()
const navigate = vi.fn()
const login = vi.fn()
const authRegister = vi.fn()
const authVerifyEmail = vi.fn()

vi.mock('../../../frontend/src/auth/AuthContext', () => ({
  useAuth: () => ({
    login,
  }),
}))

vi.mock('../../../frontend/src/components/ToastProvider', async () => {
  const actual = await vi.importActual<any>('../../../frontend/src/components/ToastProvider')
  return {
    ...actual,
    useToast: () => ({ notify }),
  }
})

vi.mock('../../../frontend/src/api/endpoints/auth', () => ({
  authRegister: (...args: any[]) => authRegister(...args),
  authVerifyEmail: (...args: any[]) => authVerifyEmail(...args),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('../../../frontend/src/auth/storage', () => ({
  clearForbidden: vi.fn(),
  getForbidden: () => ({ path: '/documents/100' }),
}))

describe('Public pages external tests', () => {
  const withTheme = (children: ReactNode) => <ThemeProvider>{children}</ThemeProvider>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits login successfully', async () => {
    login.mockResolvedValue(undefined)
    renderWithProviders(<LoginPage />, { route: '/login', wrapper: withTheme })

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'admin@local.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('admin@local.com', '1234')
      expect(notify).toHaveBeenCalledWith('Bienvenido al DMS', 'success')
      expect(navigate).toHaveBeenCalledWith('/documents')
    })
  })

  it('submits register successfully', async () => {
    authRegister.mockResolvedValue({ ok: true })
    renderWithProviders(<RegisterPage />, { route: '/register', wrapper: withTheme })

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText('Primer apellido'), { target: { value: 'Lopez' } })
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'alex@bsm.com.mx' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Password1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => {
      expect(authRegister).toHaveBeenCalled()
      expect(notify).toHaveBeenCalledWith('Registro creado. Revisa tu correo para verificar.', 'success')
      expect(navigate).toHaveBeenCalledWith('/verify-email?email=alex%40bsm.com.mx')
    })
  })

  it('submits verification successfully', async () => {
    authVerifyEmail.mockResolvedValue({ ok: true })
    renderWithProviders(<VerifyEmailPage />, { route: '/verify-email?email=user@bsm.com.mx', wrapper: withTheme })

    fireEvent.change(screen.getByLabelText('Código'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar' }))

    await waitFor(() => {
      expect(authVerifyEmail).toHaveBeenCalledWith({ email: 'user@bsm.com.mx', code: '123456' })
      expect(notify).toHaveBeenCalledWith('Correo verificado. Espera aprobación del administrador.', 'success')
      expect(navigate).toHaveBeenCalledWith('/login')
    })
  })

  it('renders forbidden page path', () => {
    renderWithProviders(<ForbiddenPage />, { route: '/forbidden' })
    expect(screen.getByText(/Bloqueado al acceder a: \/documents\/100/i)).toBeInTheDocument()
  })
})
