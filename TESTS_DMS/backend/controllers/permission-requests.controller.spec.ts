import { PermissionRequestsController } from '../../../backend/src/permissions/permission-requests.controller';

describe('PermissionRequestsController external tests', () => {
  const service = {
    createRequest: jest.fn(),
    createAreaRequest: jest.fn(),
    listMine: jest.fn(),
  };
  const controller = new PermissionRequestsController(service as any);

  beforeEach(() => jest.clearAllMocks());

  it('returns null when create has no user id', async () => {
    await expect(controller.create({ permissions: ['canRead'] } as any, { headers: {} } as any)).resolves.toBeNull();
    expect(service.createRequest).not.toHaveBeenCalled();
  });

  it('creates permission request with request context', async () => {
    service.createRequest.mockResolvedValue({ id: 1 });
    const req = { user: { id: 5 }, ip: '1.2.3.4', headers: { 'user-agent': 'jest' } } as any;
    await controller.create({ permissions: ['canRead'], comment: 'x' } as any, req);
    expect(service.createRequest).toHaveBeenCalledWith({
      userId: 5,
      permissions: ['canRead'],
      comment: 'x',
      ip: '1.2.3.4',
      userAgent: 'jest',
    });
  });

  it('returns null when createAreaRequest has no user id', async () => {
    await expect(controller.createAreaRequest({ areaCodes: ['FA'] } as any, { headers: {} } as any)).resolves.toBeNull();
    expect(service.createAreaRequest).not.toHaveBeenCalled();
  });

  it('creates area request with request context', async () => {
    service.createAreaRequest.mockResolvedValue({ id: 2 });
    const req = { user: { id: 6 }, ip: '5.6.7.8', headers: { 'user-agent': 'ua' } } as any;
    await controller.createAreaRequest({ areaCodes: ['FA'], comment: 'need' } as any, req);
    expect(service.createAreaRequest).toHaveBeenCalledWith({
      userId: 6,
      areaCodes: ['FA'],
      comment: 'need',
      ip: '5.6.7.8',
      userAgent: 'ua',
    });
  });

  it('returns empty pagination when mine has no user id', async () => {
    await expect(controller.mine({} as any, { limit: 30 } as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 30,
    });
  });

  it('delegates mine to service', async () => {
    service.listMine.mockResolvedValue({ items: [{ id: 1 }], total: 1, page: 2, limit: 10 });
    await expect(controller.mine({ user: { id: 8 } } as any, { page: 2, limit: 10 } as any)).resolves.toEqual({
      items: [{ id: 1 }],
      total: 1,
      page: 2,
      limit: 10,
    });
    expect(service.listMine).toHaveBeenCalledWith(8, { page: 2, limit: 10 });
  });
});
