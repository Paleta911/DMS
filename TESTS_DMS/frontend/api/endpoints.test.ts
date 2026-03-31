import { describe, expect, it, vi, beforeEach } from 'vitest'

const http = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

vi.mock('../../../frontend/src/api/http', () => ({
  http,
}))

describe('frontend api endpoint wrappers external tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wraps auth endpoints', async () => {
    const auth = await import('../../../frontend/src/api/endpoints/auth')
    http.post.mockResolvedValueOnce({ data: { accessToken: 'a' } })
    await expect(auth.authLogin({ email: 'a', password: 'b' })).resolves.toEqual({ accessToken: 'a' })
    expect(http.post).toHaveBeenCalledWith('/auth/login', { email: 'a', password: 'b' })

    http.post.mockResolvedValueOnce({ data: { accessToken: 'b' } })
    await auth.authRefresh({ refreshToken: 'x' })
    expect(http.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'x' })

    http.post.mockResolvedValueOnce({ data: { id: 1 } })
    await auth.authRegister({ email: 'a', password: 'b' })
    expect(http.post).toHaveBeenCalledWith('/auth/register', { email: 'a', password: 'b' })

    http.post.mockResolvedValueOnce({ data: { ok: true } })
    await auth.authVerifyEmail({ email: 'a', code: '123456' })
    expect(http.post).toHaveBeenCalledWith('/auth/verify-email', { email: 'a', code: '123456' })

    http.get.mockResolvedValueOnce({ data: { status: 'ok' } })
    await expect(auth.getHealth()).resolves.toEqual({ status: 'ok' })
    expect(http.get).toHaveBeenCalledWith('/health')
  })

  it('wraps documents endpoints and normalizes lists', async () => {
    const documents = await import('../../../frontend/src/api/endpoints/documents')
    http.get.mockResolvedValueOnce({ data: [{ id: 1 }] })
    await expect(documents.documentsList({ page: 2, limit: 5 })).resolves.toEqual({
      items: [{ id: 1 }],
      total: 1,
    })

    http.get.mockResolvedValueOnce({ data: { items: [{ id: 2 }], total: 10, page: 3, limit: 4 } })
    await expect(documents.documentsList({ page: 3, limit: 4 })).resolves.toEqual({
      items: [{ id: 2 }],
      total: 10,
      page: 3,
      limit: 4,
    })

    http.get.mockResolvedValueOnce({ data: { id: 5 } })
    await documents.getDocument(5)
    expect(http.get).toHaveBeenCalledWith('/documents/5')

    http.get.mockResolvedValueOnce({ data: [] })
    await documents.getWorkflow(5)
    expect(http.get).toHaveBeenCalledWith('/documents/5/workflow')

    http.get.mockResolvedValueOnce({ data: [] })
    await documents.getDocumentVersions(5)
    expect(http.get).toHaveBeenCalledWith('/documents/5/versions')

    const form = new FormData()
    http.post.mockResolvedValueOnce({ data: { documentId: 1, versionId: 2 } })
    await documents.uploadDocument(form)
    expect(http.post).toHaveBeenCalledWith('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    http.patch.mockResolvedValueOnce({ data: { id: 1 } })
    await documents.updateDocument(1, { nombreDocumento: 'Doc' })
    expect(http.patch).toHaveBeenCalledWith('/documents/1', { nombreDocumento: 'Doc' })

    http.patch.mockResolvedValueOnce({ data: { ok: true } })
    await documents.workflowAssign(1, 2, 3)
    expect(http.patch).toHaveBeenCalledWith('/documents/1/assign-reviewers', { revisoUserId: 2, aproboUserId: 3 })

    http.post.mockResolvedValue({ data: { ok: true } })
    await documents.workflowSubmit(1)
    expect(http.post).toHaveBeenLastCalledWith('/documents/1/submit-review')
    await documents.workflowReview(1, { decision: 'APPROVED' })
    expect(http.post).toHaveBeenLastCalledWith('/documents/1/review', { decision: 'APPROVED' })
    await documents.workflowApprove(1, { decision: 'REJECTED', comentario: 'x' })
    expect(http.post).toHaveBeenLastCalledWith('/documents/1/approve', { decision: 'REJECTED', comentario: 'x' })
    await documents.workflowObsolete(1)
    expect(http.post).toHaveBeenLastCalledWith('/documents/1/obsolete')
  })

  it('wraps categories, types, area codes and users endpoints', async () => {
    const categories = await import('../../../frontend/src/api/endpoints/categories')
    const types = await import('../../../frontend/src/api/endpoints/types')
    const users = await import('../../../frontend/src/api/endpoints/users')

    http.get.mockResolvedValueOnce({ data: [] })
    await categories.categoriesList()
    expect(http.get).toHaveBeenCalledWith('/categories')

    http.post.mockResolvedValueOnce({ data: { id: 1 } })
    await categories.categoriesCreate('Calidad')
    expect(http.post).toHaveBeenCalledWith('/categories', { nombre: 'Calidad' })

    http.patch.mockResolvedValueOnce({ data: { id: 1 } })
    await categories.categoriesUpdate(1, { nombre: 'Nueva' })
    expect(http.patch).toHaveBeenCalledWith('/categories/1', { nombre: 'Nueva' })

    http.delete.mockResolvedValueOnce({ data: { success: true } })
    await categories.categoriesDelete(1)
    expect(http.delete).toHaveBeenCalledWith('/categories/1')

    http.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, limit: 20 } })
    await categories.adminCategoriesList({ q: 'c' })
    expect(http.get).toHaveBeenCalledWith('/categories', { params: { q: 'c' } })

    http.get.mockResolvedValueOnce({ data: [] })
    await types.documentTypesList()
    expect(http.get).toHaveBeenCalledWith('/document-types')

    http.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, limit: 20 } })
    await types.adminDocumentTypesList({ q: 'pr' })
    expect(http.get).toHaveBeenCalledWith('/document-types', { params: { q: 'pr' } })

    http.post.mockResolvedValueOnce({ data: { id: 1 } })
    await types.documentTypesCreate({ code: 'PRO', nombreLargo: 'Procedimiento' })
    expect(http.post).toHaveBeenCalledWith('/document-types', { code: 'PRO', nombreLargo: 'Procedimiento' })

    http.patch.mockResolvedValueOnce({ data: { id: 1 } })
    await types.documentTypesUpdate(1, { nombreLargo: 'Nuevo' })
    expect(http.patch).toHaveBeenCalledWith('/document-types/1', { nombreLargo: 'Nuevo' })

    http.delete.mockResolvedValueOnce({ data: { success: true } })
    await types.documentTypesDelete(1)
    expect(http.delete).toHaveBeenCalledWith('/document-types/1')

    http.get.mockResolvedValueOnce({ data: [] })
    await types.areaCodesList()
    expect(http.get).toHaveBeenCalledWith('/area-codes')

    http.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, limit: 20 } })
    await types.areaCodesListPaged({ q: 'fa' })
    expect(http.get).toHaveBeenCalledWith('/area-codes', { params: { q: 'fa' } })

    http.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, limit: 20 } })
    await types.adminAreaCodesList({ q: 'fa' })
    expect(http.get).toHaveBeenCalledWith('/area-codes', { params: { q: 'fa' } })

    http.post.mockResolvedValueOnce({ data: { id: 1 } })
    await types.areaCodesCreate({ code: 'FA', nombre: 'Finanzas' })
    expect(http.post).toHaveBeenCalledWith('/area-codes', { code: 'FA', nombre: 'Finanzas' })

    http.patch.mockResolvedValueOnce({ data: { id: 1 } })
    await types.areaCodesUpdate(1, { nombre: 'Nuevo' })
    expect(http.patch).toHaveBeenCalledWith('/area-codes/1', { nombre: 'Nuevo' })

    http.delete.mockResolvedValueOnce({ data: { success: true } })
    await types.areaCodesDelete(1)
    expect(http.delete).toHaveBeenCalledWith('/area-codes/1')

    http.get.mockResolvedValueOnce({ data: { id: 1 } })
    await users.usersGet(1)
    expect(http.get).toHaveBeenCalledWith('/users/1')

    http.get.mockResolvedValueOnce({ data: { id: 1 } })
    await users.usersMe()
    expect(http.get).toHaveBeenCalledWith('/users/me')

    http.patch.mockResolvedValueOnce({ data: { id: 1 } })
    await users.usersSetAreas(1, ['FA'])
    expect(http.patch).toHaveBeenCalledWith('/users/1/areas', { areaCodes: ['FA'] })

    http.get.mockResolvedValueOnce({ data: [] })
    await users.usersSearch('alex', 5)
    expect(http.get).toHaveBeenCalledWith('/users/search', { params: { q: 'alex', limit: 5 } })
  })

  it('wraps permission, audit, analytics, search and version endpoints', async () => {
    const permissions = await import('../../../frontend/src/api/endpoints/permissionRequests')
    const audit = await import('../../../frontend/src/api/endpoints/audit')
    const analytics = await import('../../../frontend/src/api/endpoints/adminAnalytics')
    const registrations = await import('../../../frontend/src/api/endpoints/adminRegistrations')
    const search = await import('../../../frontend/src/api/endpoints/search')
    const versions = await import('../../../frontend/src/api/endpoints/versions')

    http.post.mockResolvedValueOnce({ data: { id: 1 } })
    await permissions.permissionRequestsCreate({ permissions: ['READ'] as any[] })
    expect(http.post).toHaveBeenCalledWith('/permission-requests', { permissions: ['READ'] })

    http.post.mockResolvedValueOnce({ data: { id: 2 } })
    await permissions.areaRequestsCreate({ areaCodes: ['FA'] })
    expect(http.post).toHaveBeenCalledWith('/permission-requests/areas', { areaCodes: ['FA'] })

    http.get.mockResolvedValueOnce({ data: [{ id: 1 }] })
    await expect(permissions.permissionRequestsMine({ page: 2, limit: 5 })).resolves.toEqual({
      items: [{ id: 1 }],
      total: 1,
      page: 2,
      limit: 5,
    })

    http.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, limit: 20 } })
    await permissions.adminPermissionRequestsList({ status: 'PENDING' as any })
    expect(http.get).toHaveBeenCalledWith('/admin/permission-requests', { params: { status: 'PENDING' } })

    http.get.mockResolvedValueOnce({ data: { id: 1 } })
    await permissions.adminPermissionRequestGet(1)
    expect(http.get).toHaveBeenCalledWith('/admin/permission-requests/1')

    http.post.mockResolvedValue({ data: { ok: true } })
    await permissions.adminPermissionRequestApprove(1)
    expect(http.post).toHaveBeenLastCalledWith('/admin/permission-requests/1/approve')
    await permissions.adminPermissionRequestApprovePartial(1, { areaCodes: ['FA'], note: 'ok' })
    expect(http.post).toHaveBeenLastCalledWith('/admin/permission-requests/1/approve-partial', { areaCodes: ['FA'], note: 'ok' })
    await permissions.adminPermissionRequestReject(1, 'no')
    expect(http.post).toHaveBeenLastCalledWith('/admin/permission-requests/1/reject', { reason: 'no' })

    http.get.mockResolvedValueOnce({ data: new Blob() })
    await permissions.adminPermissionRequestsExportCsv({ maxRows: 10 })
    expect(http.get).toHaveBeenCalledWith('/admin/permission-requests/export.csv', {
      params: { maxRows: 10 },
      responseType: 'blob',
    })

    http.get.mockResolvedValueOnce({ data: { items: [] } })
    await audit.auditLogsList({ page: 1 })
    expect(http.get).toHaveBeenCalledWith('/audit-logs', { params: { page: 1 } })

    http.get.mockResolvedValueOnce({ data: new Blob() })
    await audit.auditLogsExportCsv({ maxRows: 10 })
    expect(http.get).toHaveBeenCalledWith('/audit-logs/export.csv', { params: { maxRows: 10 }, responseType: 'blob' })

    http.get.mockResolvedValueOnce({ data: new Blob() })
    await audit.auditLogsExportJson({ maxRows: 10 })
    expect(http.get).toHaveBeenCalledWith('/audit-logs/export.json', { params: { maxRows: 10 }, responseType: 'blob' })

    http.get.mockResolvedValueOnce({ data: { ok: true } })
    await analytics.adminAnalyticsSummary()
    expect(http.get).toHaveBeenCalledWith('/admin/analytics/summary')

    http.get.mockResolvedValueOnce({ data: { items: [] } })
    await registrations.adminRegistrationsList({ status: 'APPROVED' })
    expect(http.get).toHaveBeenCalledWith('/admin/registrations', { params: { status: 'APPROVED' } })

    http.post.mockResolvedValue({ data: { ok: true } })
    await registrations.adminRegistrationApprove(1)
    expect(http.post).toHaveBeenLastCalledWith('/admin/registrations/1/approve')
    await registrations.adminRegistrationReject(1, 'motivo')
    expect(http.post).toHaveBeenLastCalledWith('/admin/registrations/1/reject', { reason: 'motivo' })
    await registrations.adminRegistrationResend(1)
    expect(http.post).toHaveBeenLastCalledWith('/admin/registrations/1/resend-code')
    await registrations.adminRegistrationForceVerify(1)
    expect(http.post).toHaveBeenLastCalledWith('/admin/registrations/1/force-verify')

    http.get.mockResolvedValueOnce({ data: new Blob() })
    await registrations.adminRegistrationsExportCsv({ maxRows: 5 })
    expect(http.get).toHaveBeenCalledWith('/admin/registrations/export.csv', {
      params: { maxRows: 5 },
      responseType: 'blob',
    })

    http.get.mockResolvedValueOnce({ data: { items: [] } })
    await search.searchQuery({ q: 'demo' })
    expect(http.get).toHaveBeenCalledWith('/search', { params: { q: 'demo' } })

    http.post.mockResolvedValueOnce({ data: { ok: true } })
    await search.searchReindex()
    expect(http.post).toHaveBeenCalledWith('/search/reindex')

    http.get.mockResolvedValueOnce({ data: { engine: 'elastic', indexName: 'dms' } })
    await search.searchIndexStatus()
    expect(http.get).toHaveBeenCalledWith('/search/index-status')

    http.get.mockResolvedValueOnce({
      data: new Blob(['x']),
      headers: { 'content-disposition': 'attachment; filename=\"v1.pdf\"' },
    })
    await expect(versions.downloadVersion(1)).resolves.toEqual({
      blob: expect.any(Blob),
      disposition: 'attachment; filename=\"v1.pdf\"',
    })
    expect(http.get).toHaveBeenCalledWith('/versions/1/download', {
      responseType: 'blob',
    })
  })
})
