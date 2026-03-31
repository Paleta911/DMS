import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '../request-context';

type RequestWithId = Request & { requestId?: string };

export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
) {
  const headerValue = req.headers['x-request-id'];
  const requestId =
    typeof headerValue === 'string' && headerValue.length > 0
      ? headerValue
      : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  runWithRequestContext({ requestId }, next);
}
