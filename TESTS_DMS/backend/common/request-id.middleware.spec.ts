import { requestIdMiddleware } from '../../../backend/src/common/middleware/request-id.middleware';

describe('requestIdMiddleware external tests', () => {
  it('uses x-request-id header when present', () => {
    const req = { headers: { 'x-request-id': 'abc-123' } } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();

    requestIdMiddleware(req, res, next);
    expect(req.requestId).toBe('abc-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'abc-123');
    expect(next).toHaveBeenCalled();
  });

  it('creates request id when missing', () => {
    const req = { headers: {} } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();

    requestIdMiddleware(req, res, next);
    expect(typeof req.requestId).toBe('string');
    expect(req.requestId.length).toBeGreaterThan(0);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
  });
});
