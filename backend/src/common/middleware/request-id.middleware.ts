import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '../request-context';

type RequestWithId = Request & { requestId?: string };

export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
) {
  // Reutiliza el id entrante para trazabilidad distribuida o genera uno nuevo.
  const headerValue = req.headers['x-request-id'];
  const requestId =
    typeof headerValue === 'string' && headerValue.length > 0
      ? headerValue
      : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // Propaga el requestId al contexto async para logs/metricas correlacionados.
  runWithRequestContext({ requestId }, next);
}
