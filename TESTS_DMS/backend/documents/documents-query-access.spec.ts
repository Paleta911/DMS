import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DocumentsAccessService } from '../../../backend/src/documents/documents-access.service'
import { DocumentsQueryService } from '../../../backend/src/documents/documents-query.service'

function createSubQueryMock() {
  return {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getQuery: jest.fn().mockReturnValue('(latest-version-subquery)'),
  }
}

describe('DocumentsAccessService external tests', () => {
  it('rejects immediately when allowed areas are empty', async () => {
    const service = new DocumentsAccessService({ findOne: jest.fn() } as any)

    await expect(service.ensureAccess(10, [])).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('throws not found when the document does not exist', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue(null) }
    const service = new DocumentsAccessService(repo as any)

    await expect(service.ensureAccess(10, ['RC'])).rejects.toBeInstanceOf(NotFoundException)
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 10 },
      relations: { areaCode: true },
    })
  })

  it('returns the document when scope is valid', async () => {
    const document = { id: 10, areaCode: { code: 'RC' } }
    const repo = { findOne: jest.fn().mockResolvedValue(document) }
    const service = new DocumentsAccessService(repo as any)

    await expect(service.ensureAccess(10, ['RC'])).resolves.toEqual(document)
  })

  it('asserts scope variants correctly', () => {
    const service = new DocumentsAccessService({ findOne: jest.fn() } as any)
    const scopedDocument = { areaCode: { code: 'RC' } } as any
    const orphanDocument = { areaCode: null } as any

    expect(() => service.assertDocumentScope(scopedDocument, null)).not.toThrow()
    expect(() => service.assertDocumentScope(scopedDocument, ['RC'])).not.toThrow()
    expect(() => service.assertDocumentScope(scopedDocument, [])).toThrow(ForbiddenException)
    expect(() => service.assertDocumentScope(scopedDocument, ['FA'])).toThrow(ForbiddenException)
    expect(() => service.assertDocumentScope(orphanDocument, ['RC'])).toThrow(ForbiddenException)
  })
})

describe('DocumentsQueryService external tests', () => {
  function createListQueryBuilder(items: any[], total: number) {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([items, total]),
    }
    return qb
  }

  function createLatestVersionBuilder(entities: any[], raw: any[]) {
    const subQuery = createSubQueryMock()
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockImplementation((arg: unknown) => {
        if (typeof arg === 'function') {
          arg({ subQuery: () => subQuery })
        }
        return qb
      }),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities, raw }),
    }
    return qb
  }

  it('returns an empty result when allowed areas are explicitly empty', async () => {
    const qb = createListQueryBuilder([], 0)
    const service = new DocumentsQueryService(
      { createQueryBuilder: jest.fn().mockReturnValue(qb) } as any,
      { createQueryBuilder: jest.fn(), find: jest.fn() } as any,
      { ensureAccess: jest.fn() } as any,
    )

    await expect(service.list({ allowedAreaCodes: [] })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    })
  })

  it('applies filters, sorting and latest version mapping', async () => {
    const documents = [
      { id: 1, nombre: 'Manual', createdAt: '2026-03-01', areaCode: { code: 'RC' } },
    ]
    const latestVersion = { id: 9, createdAt: '2026-03-05', uploadedBy: { id: 3 } }
    const documentQb = createListQueryBuilder(documents, 1)
    const latestQb = createLatestVersionBuilder([latestVersion], [{ documentId: 1 }])
    const documentRepo = { createQueryBuilder: jest.fn().mockReturnValue(documentQb) }
    const versionRepo = { createQueryBuilder: jest.fn().mockReturnValue(latestQb), find: jest.fn() }

    const service = new DocumentsQueryService(
      documentRepo as any,
      versionRepo as any,
      { ensureAccess: jest.fn() } as any,
    )

    const result = await service.list({
      page: 2,
      limit: 10,
      categoryId: '5',
      documentTypeCode: 'pro',
      areaCode: 'rc',
      sortByName: 'az',
      allowedAreaCodes: ['RC'],
    })

    expect(documentQb.skip).toHaveBeenCalledWith(10)
    expect(documentQb.take).toHaveBeenCalledWith(10)
    expect(documentQb.andWhere).toHaveBeenCalledWith('areaCode.code IN (:...allowed)', {
      allowed: ['RC'],
    })
    expect(documentQb.andWhere).toHaveBeenCalledWith('category.id = :categoryId', {
      categoryId: 5,
    })
    expect(documentQb.andWhere).toHaveBeenCalledWith(
      'documentType.code = :documentTypeCode',
      { documentTypeCode: 'PRO' },
    )
    expect(documentQb.andWhere).toHaveBeenCalledWith('areaCode.code = :areaCode', {
      areaCode: 'RC',
    })
    expect(documentQb.orderBy).toHaveBeenCalledWith('document.nombre', 'ASC')
    expect(result).toEqual({
      items: [{ ...documents[0], latestVersion }],
      total: 1,
      page: 2,
      limit: 10,
    })
  })

  it('returns latest version as null when no version metadata exists', async () => {
    const documents = [{ id: 1, nombre: 'Manual', createdAt: '2026-03-01', areaCode: { code: 'RC' } }]
    const documentRepo = { createQueryBuilder: jest.fn().mockReturnValue(createListQueryBuilder(documents, 1)) }
    const versionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(createLatestVersionBuilder([], [])),
      find: jest.fn(),
    }

    const service = new DocumentsQueryService(
      documentRepo as any,
      versionRepo as any,
      { ensureAccess: jest.fn() } as any,
    )

    const result = await service.list({ allowedAreaCodes: ['RC'], sortByName: 'za' })

    expect(result.items[0].latestVersion).toBeNull()
  })

  it('findOne delegates access service and enriches with versions', async () => {
    const access = {
      ensureAccess: jest.fn().mockResolvedValue({ id: 10, nombre: 'Manual' }),
    }
    const versionRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 3, createdAt: '2026-03-03' },
        { id: 2, createdAt: '2026-03-02' },
      ]),
      createQueryBuilder: jest.fn(),
    }
    const service = new DocumentsQueryService({ createQueryBuilder: jest.fn() } as any, versionRepo as any, access as any)

    const result = await service.findOne(10, 2, ['RC'])

    expect(access.ensureAccess).toHaveBeenCalledWith(
      10,
      ['RC'],
      {
        areaCode: true,
        category: true,
        documentType: true,
        createdBy: true,
      },
    )
    expect(versionRepo.find).toHaveBeenCalledWith({
      where: { document: { id: 10 } },
      order: { createdAt: 'DESC' },
      take: 2,
      relations: ['uploadedBy'],
    })
    expect(result.latestVersion).toEqual({ id: 3, createdAt: '2026-03-03' })
  })

  it('findVersionsByDocument validates access and returns versions', async () => {
    const access = { ensureAccess: jest.fn().mockResolvedValue({ id: 11 }) }
    const versionRepo = {
      find: jest.fn().mockResolvedValue([{ id: 8 }]),
      createQueryBuilder: jest.fn(),
    }
    const service = new DocumentsQueryService({ createQueryBuilder: jest.fn() } as any, versionRepo as any, access as any)

    await expect(service.findVersionsByDocument(11, ['RC'])).resolves.toEqual([{ id: 8 }])
    expect(access.ensureAccess).toHaveBeenCalledWith(11, ['RC'], { areaCode: true })
  })
})
