import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../frontend/src/test/test-utils'
import type { ReactNode } from 'react'
import { ToastProvider } from '../../../frontend/src/components/ToastProvider'
import { ThemeProvider } from '../../../frontend/src/theme/ThemeProvider'
import ProfilePage from '../../../frontend/src/pages/ProfilePage'
import DocumentDetailPage from '../../../frontend/src/pages/DocumentDetailPage'

const usersMe = vi.fn()
const documentDetail = vi.fn()
const documentWorkflow = vi.fn()
const documentVersions = vi.fn()
const downloadVersion = vi.fn()

vi.mock('../../../frontend/src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'user@bsm.com.mx',
      status: 'APPROVED',
      nombre: 'Sus',
      permissions: { canRead: true },
    },
  }),
}))

vi.mock('../../../frontend/src/api/endpoints/users', () => ({
  usersMe: (...args: any[]) => usersMe(...args),
}))

vi.mock('../../../frontend/src/api/endpoints/documents', () => ({
  getDocument: (...args: any[]) => documentDetail(...args),
  getWorkflow: (...args: any[]) => documentWorkflow(...args),
  getDocumentVersions: (...args: any[]) => documentVersions(...args),
  workflowAssign: vi.fn(),
  workflowObsolete: vi.fn(),
  workflowReview: vi.fn(),
  workflowApprove: vi.fn(),
  workflowSubmit: vi.fn(),
  uploadDocument: vi.fn(),
}))

vi.mock('../../../frontend/src/api/endpoints/versions', () => ({
  downloadVersion: (...args: any[]) => downloadVersion(...args),
}))

vi.mock('../../../frontend/src/hooks/useCatalogQueries', () => ({
  useCatalogQueries: () => ({
    categoriesQuery: { data: [] },
    typesQuery: { data: [] },
    areasQuery: { data: [] },
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: '1064' }),
  }
})

describe('Profile and document detail external smoke', () => {
  const withAppProviders = (children: ReactNode) => (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    downloadVersion.mockResolvedValue({ blob: new Blob(['x'], { type: 'application/pdf' }) })
  })

  it('renders profile data and tasks', async () => {
    usersMe.mockResolvedValue({
      email: 'sus@bsm.com.mx',
      status: 'APPROVED',
      nombre: 'Sus',
      primerApellido: 'Sus',
      segundoApellido: 'Sus',
      telefono: '123',
      fechaNacimiento: '2026-02-27',
      permissions: {
        canAccess: true,
        canRead: true,
        canUpload: false,
        canUploadNewVersion: false,
        canReview: false,
        canApprove: false,
        canDelete: false,
      },
      tasks: { pendingReview: 1, pendingApprove: 2 },
    })

    renderWithProviders(<ProfilePage />, { route: '/profile' })
    await waitFor(() => expect(screen.getByText('sus@bsm.com.mx')).toBeInTheDocument())
    expect(screen.getByText(/documentos pendientes por revisar/i)).toBeInTheDocument()
    expect(screen.getByText(/Acceso al sistema/i)).toBeInTheDocument()
  })

  it('renders document detail smoke with OCR metadata', async () => {
    documentDetail.mockResolvedValue({
      id: 1064,
      nombre: 'Doc demo',
      status: 'DRAFT',
      codigo: 'PRO-FA-01',
      category: { nombre: 'Calidad' },
      documentType: { code: 'PRO', nombreLargo: 'Procedimiento' },
      areaCode: { code: 'FA', nombre: 'Finanzas' },
      createdBy: { email: 'user@bsm.com.mx' },
    })
    documentWorkflow.mockResolvedValue([
      { id: 1, step: 'ELABORO', decision: 'PENDING', user: { email: 'user@bsm.com.mx' } },
    ])
    documentVersions.mockResolvedValue([
      {
        id: 1,
        originalName: 'scan.pdf',
        comentario: 'carga',
        createdAt: '2026-03-18T00:00:00.000Z',
        textSource: 'PDF_OCR',
        ocrApplied: true,
        ocrPageCount: 2,
      },
    ])

    renderWithProviders(<DocumentDetailPage />, { route: '/documents/1064', wrapper: withAppProviders })
    await waitFor(() => expect(screen.getAllByText('Doc demo').length).toBeGreaterThan(0))
    expect(screen.getAllByText(/OCR/i).length).toBeGreaterThan(0)
  })
})
