import { CategoriesService } from '../../../backend/src/categories/categories.service'
import { AreaCodesService } from '../../../backend/src/area-codes/area-codes.service'
import { DocumentTypesService } from '../../../backend/src/document-types/document-types.service'
import { RegistrationsService } from '../../../backend/src/admin/registrations.service'
import { PermissionRequestsService } from '../../../backend/src/permissions/permission-requests.service'
import { DocumentsService } from '../../../backend/src/documents/documents.service'
import { AuditLogService } from '../../../backend/src/audit-log/audit-log.service'
import { SearchService } from '../../../backend/src/search/search.service'
import { VersionsService } from '../../../backend/src/versions/versions.service'

describe('Facade services external tests', () => {
  it('delegates category operations to query and mutation services', async () => {
    const query = { findAll: jest.fn().mockResolvedValue(['c1']) }
    const mutation = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1, nombre: 'Calidad' }),
      remove: jest.fn().mockResolvedValue(undefined),
    }
    const service = new CategoriesService(query as any, mutation as any)

    await expect(service.create('Calidad')).resolves.toEqual({ id: 1 })
    await expect(service.findAll({ q: 'cal' })).resolves.toEqual(['c1'])
    await expect(service.update(1, { nombre: 'Calidad' })).resolves.toEqual({
      id: 1,
      nombre: 'Calidad',
    })
    await expect(service.remove(1)).resolves.toBeUndefined()
  })

  it('delegates area code operations to query and mutation services', async () => {
    const query = {
      findAll: jest.fn().mockResolvedValue(['RC']),
      findActiveList: jest.fn().mockResolvedValue(['RC', 'FA']),
    }
    const mutation = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1, code: 'RC' }),
      remove: jest.fn().mockResolvedValue(undefined),
    }
    const service = new AreaCodesService(query as any, mutation as any)

    await expect(service.findAll({ q: 'R' })).resolves.toEqual(['RC'])
    await expect(service.findActiveList()).resolves.toEqual(['RC', 'FA'])
    await expect(service.create({ code: 'RC' } as any)).resolves.toEqual({ id: 1 })
    await expect(service.update(1, { code: 'RC' } as any)).resolves.toEqual({
      id: 1,
      code: 'RC',
    })
    await expect(service.remove(1)).resolves.toBeUndefined()
  })

  it('delegates document type operations to query and mutation services', async () => {
    const query = { findAll: jest.fn().mockResolvedValue(['PRO']) }
    const mutation = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1, code: 'PRO' }),
      remove: jest.fn().mockResolvedValue(undefined),
    }
    const service = new DocumentTypesService(query as any, mutation as any)

    await expect(service.findAll({ q: 'P' })).resolves.toEqual(['PRO'])
    await expect(service.create({ code: 'PRO' } as any)).resolves.toEqual({ id: 1 })
    await expect(service.update(1, { code: 'PRO' } as any)).resolves.toEqual({
      id: 1,
      code: 'PRO',
    })
    await expect(service.remove(1)).resolves.toBeUndefined()
  })

  it('delegates registration flows to query and action services', async () => {
    const query = {
      list: jest.fn().mockResolvedValue({ items: [] }),
      exportCsv: jest.fn().mockResolvedValue('id,email'),
    }
    const action = {
      approve: jest.fn().mockResolvedValue({ ok: true }),
      reject: jest.fn().mockResolvedValue({ ok: true }),
      resendCode: jest.fn().mockResolvedValue({ ok: true }),
      forceVerify: jest.fn().mockResolvedValue({ ok: true }),
    }
    const service = new RegistrationsService(query as any, action as any)

    await expect(service.list({ q: 'sus' } as any)).resolves.toEqual({ items: [] })
    await expect(service.exportCsv({ q: 'sus' } as any)).resolves.toBe('id,email')
    await expect(service.approve({ id: 1, adminId: 2 })).resolves.toEqual({ ok: true })
    await expect(service.reject({ id: 1, adminId: 2, reason: 'faltan datos' })).resolves.toEqual({ ok: true })
    await expect(service.resendCode({ id: 1, adminId: 2 })).resolves.toEqual({ ok: true })
    await expect(service.forceVerify({ id: 1, adminId: 2 })).resolves.toEqual({ ok: true })
  })

  it('delegates permission request flows to subservices', async () => {
    const create = {
      createRequest: jest.fn().mockResolvedValue({ id: 1 }),
      createAreaRequest: jest.fn().mockResolvedValue({ id: 2 }),
    }
    const query = {
      listMine: jest.fn().mockResolvedValue({ items: [] }),
      listAll: jest.fn().mockResolvedValue({ items: [] }),
      exportCsv: jest.fn().mockResolvedValue('id,status'),
      getById: jest.fn().mockResolvedValue({ id: 7 }),
    }
    const review = {
      approveRequest: jest.fn().mockResolvedValue({ ok: true }),
      approvePartialAreaRequest: jest.fn().mockResolvedValue({ ok: true }),
      rejectRequest: jest.fn().mockResolvedValue({ ok: true }),
    }
    const service = new PermissionRequestsService(create as any, query as any, review as any)

    await expect(service.createRequest({ userId: 1, permissions: [] } as any)).resolves.toEqual({ id: 1 })
    await expect(service.createAreaRequest({ userId: 1, areaCodes: ['RC'] } as any)).resolves.toEqual({ id: 2 })
    await expect(service.listMine(1, { page: 2 })).resolves.toEqual({ items: [] })
    await expect(service.listAll({ status: 'PENDING' } as any)).resolves.toEqual({ items: [] })
    await expect(service.exportCsv({ status: 'PENDING' } as any)).resolves.toBe('id,status')
    await expect(service.getById(7)).resolves.toEqual({ id: 7 })
    await expect(service.approveRequest({ id: 7, adminId: 1 })).resolves.toEqual({ ok: true })
    await expect(
      service.approvePartialAreaRequest({ id: 7, adminId: 1, areaCodes: ['RC'] }),
    ).resolves.toEqual({ ok: true })
    await expect(service.rejectRequest({ id: 7, adminId: 1, reason: 'no procede' })).resolves.toEqual({ ok: true })
  })

  it('delegates document, audit, search and version facades', async () => {
    const documents = new DocumentsService(
      {
        list: jest.fn().mockResolvedValue({ items: [] }),
        findOne: jest.fn().mockResolvedValue({ id: 1 }),
        findVersionsByDocument: jest.fn().mockResolvedValue([{ id: 1 }]),
      } as any,
      {
        upload: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn().mockResolvedValue({ id: 1, workflowReset: false }),
      } as any,
      {
        assertUploadFileSignature: jest.fn(),
        extractContentText: jest.fn().mockResolvedValue('contenido'),
        extractTextDetails: jest.fn().mockResolvedValue({
          contentText: 'contenido',
          textSource: 'PDF_TEXT',
          ocrApplied: false,
          ocrPageCount: null,
        }),
      } as any,
      { ensureAccess: jest.fn().mockResolvedValue({ id: 1 }) } as any,
      {
        getWorkflow: jest.fn().mockResolvedValue([]),
        assignReviewers: jest.fn().mockResolvedValue({ ok: true }),
        submitReview: jest.fn().mockResolvedValue({ ok: true }),
        reviewDecision: jest.fn().mockResolvedValue({ ok: true }),
        markObsolete: jest.fn().mockResolvedValue({ ok: true }),
      } as any,
      {
        reprocessContent: jest.fn().mockResolvedValue({ processed: 1 }),
      } as any,
    )
    const audit = new AuditLogService(
      { log: jest.fn().mockResolvedValue({ id: 1 }) } as any,
      { query: jest.fn().mockResolvedValue({ items: [] }), exportCsv: jest.fn().mockResolvedValue('csv'), exportJson: jest.fn().mockResolvedValue([{ id: 1 }]) } as any,
    )
    const search = new SearchService(
      { indexDocument: jest.fn().mockResolvedValue(undefined), enqueueIndexDocument: jest.fn(), reindexAll: jest.fn().mockResolvedValue({ indexed: 1 }), getIndexStatus: jest.fn().mockResolvedValue({ pendingIndexJobs: 0 }) } as any,
      { search: jest.fn().mockResolvedValue({ items: [] }) } as any,
      { checkElasticHealth: jest.fn().mockResolvedValue({ ready: true }), checkElasticHealthCached: jest.fn().mockResolvedValue({ ready: true }) } as any,
    )
    const versions = new VersionsService(
      { findByDocument: jest.fn().mockResolvedValue([{ id: 1 }]), findById: jest.fn().mockResolvedValue({ id: 9 }) } as any,
      { create: jest.fn().mockResolvedValue({ id: 9 }), getDocumentAreaCode: jest.fn().mockResolvedValue('RC') } as any,
    )

    await expect(documents.list({ page: 1 })).resolves.toEqual({ items: [] })
    await expect(documents.findOne(1)).resolves.toEqual({ id: 1 })
    await expect(documents.findVersionsByDocument(1)).resolves.toEqual([{ id: 1 }])
    await expect(documents.extractContentText({ filePath: 'x', originalName: 'a.pdf', mimeType: 'application/pdf' })).resolves.toBe('contenido')
    await expect(documents.extractTextDetails({ filePath: 'x', originalName: 'a.pdf', mimeType: 'application/pdf' })).resolves.toEqual({
      contentText: 'contenido',
      textSource: 'PDF_TEXT',
      ocrApplied: false,
      ocrPageCount: null,
    })
    await expect(documents.ensureAccess(1)).resolves.toEqual({ id: 1 })
    await expect(documents.getWorkflow(1)).resolves.toEqual([])
    await expect(documents.assignReviewers(1, 2, 3)).resolves.toEqual({ ok: true })
    await expect(documents.submitReview(1, 2, true)).resolves.toEqual({ ok: true })
    await expect(documents.reviewDecision({ documentId: 1, actorId: 2, decision: 'APPROVED' as any, step: 'REVISO' as any })).resolves.toEqual({ ok: true })
    await expect(documents.markObsolete(1)).resolves.toEqual({ ok: true })
    await expect(documents.reprocessContent({ documentId: 1 } as any)).resolves.toEqual({ processed: 1 })

    await expect(audit.query({ action: 'LOGIN' } as any)).resolves.toEqual({ items: [] })
    await expect(audit.exportCsv({} as any)).resolves.toBe('csv')
    await expect(audit.exportJson({} as any)).resolves.toEqual([{ id: 1 }])
    await expect(audit.log({ action: 'LOGIN' } as any)).resolves.toEqual({ id: 1 })

    await expect(search.search({ q: 'doc' } as any)).resolves.toEqual({ items: [] })
    await expect(search.indexDocument(1)).resolves.toBeUndefined()
    expect(search.enqueueIndexDocument(2)).toBeUndefined()
    await expect(search.reindexAll()).resolves.toEqual({ indexed: 1 })
    await expect(search.getIndexStatus()).resolves.toEqual({ pendingIndexJobs: 0 })
    await expect(search.checkElasticHealth()).resolves.toEqual({ ready: true })
    await expect(search.checkElasticHealthCached()).resolves.toEqual({ ready: true })

    await expect(versions.findByDocument(1)).resolves.toEqual([{ id: 1 }])
    await expect(versions.findById(9)).resolves.toEqual({ id: 9 })
    await expect(versions.create({ documentId: 1 } as any)).resolves.toEqual({ id: 9 })
    await expect(versions.getDocumentAreaCode(1)).resolves.toBe('RC')
  })
})
