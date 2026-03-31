import { NotFoundException } from '@nestjs/common'
import type { Repository } from 'typeorm'
import { VersionsMutationService } from '../../../backend/src/versions/versions-mutation.service'
import { VersionsQueryService } from '../../../backend/src/versions/versions-query.service'

describe('Versions services external tests', () => {
  const makeRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 1, ...value })),
  }) as unknown as jest.Mocked<Repository<any>>

  it('lists versions by document with relations and sort order', async () => {
    const versionRepo = makeRepo()
    versionRepo.find.mockResolvedValue([{ id: 1 } as any])

    const service = new VersionsQueryService(versionRepo as any)
    await expect(service.findByDocument(44)).resolves.toEqual([{ id: 1 }])
    expect(versionRepo.find).toHaveBeenCalledWith({
      where: { document: { id: 44 } },
      order: { createdAt: 'DESC' },
      relations: ['document', 'uploadedBy'],
    })
  })

  it('returns a version by id with document area relation', async () => {
    const versionRepo = makeRepo()
    versionRepo.findOne.mockResolvedValue({ id: 5 } as any)

    const service = new VersionsQueryService(versionRepo as any)
    await expect(service.findById(5)).resolves.toEqual({ id: 5 })
  })

  it('throws when version by id does not exist', async () => {
    const versionRepo = makeRepo()
    versionRepo.findOne.mockResolvedValue(null)

    const service = new VersionsQueryService(versionRepo as any)
    await expect(service.findById(5)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('creates a version for an existing document', async () => {
    const versionRepo = makeRepo()
    const documentRepo = makeRepo()
    documentRepo.findOne.mockResolvedValue({ id: 10, areaCode: { code: 'FA' } } as any)

    const service = new VersionsMutationService(versionRepo as any, documentRepo as any)
    const result = await service.create({
      documentId: 10,
      storedName: 'stored.pdf',
      originalName: 'original.pdf',
      comentario: 'comentario',
      uploadedById: 99,
    })

    expect(documentRepo.findOne).toHaveBeenCalledWith({
      where: { id: 10 },
      relations: ['areaCode'],
    })
    expect(versionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        storedName: 'stored.pdf',
        originalName: 'original.pdf',
        comentario: 'comentario',
        document: { id: 10, areaCode: { code: 'FA' } },
        uploadedBy: { id: 99 },
      }),
    )
    expect(result).toMatchObject({ id: 1, originalName: 'original.pdf' })
  })

  it('throws when creating a version for an unknown document', async () => {
    const versionRepo = makeRepo()
    const documentRepo = makeRepo()
    documentRepo.findOne.mockResolvedValue(null)

    const service = new VersionsMutationService(versionRepo as any, documentRepo as any)
    await expect(
      service.create({
        documentId: 10,
        storedName: 'stored.pdf',
        originalName: 'original.pdf',
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('returns the document area code or null', async () => {
    const versionRepo = makeRepo()
    const documentRepo = makeRepo()
    documentRepo.findOne.mockResolvedValueOnce({ id: 10, areaCode: { code: 'RC' } } as any)
    documentRepo.findOne.mockResolvedValueOnce({ id: 10, areaCode: null } as any)

    const service = new VersionsMutationService(versionRepo as any, documentRepo as any)
    await expect(service.getDocumentAreaCode(10)).resolves.toBe('RC')
    await expect(service.getDocumentAreaCode(10)).resolves.toBeNull()
  })
})
