import { BadRequestException, HttpException } from '@nestjs/common';
import { MulterError } from 'multer';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { AppExceptionFilter } from '../../../backend/src/common/filters/app-exception.filter';
import { MulterExceptionFilter } from '../../../backend/src/common/filters/multer-exception.filter';
import { RequestLoggingInterceptor } from '../../../backend/src/common/interceptors/request-logging.interceptor';

describe('Filters and interceptors external tests', () => {
  it('handles MulterError in AppExceptionFilter', () => {
    const filter = new AppExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/documents', headers: {}, method: 'POST' }),
        getResponse: () => ({ status }),
      }),
    } as any;

    filter.catch(new MulterError('LIMIT_FILE_SIZE'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, code: 'LIMIT_FILE_SIZE' }));
  });

  it('handles HttpException in AppExceptionFilter', () => {
    const filter = new AppExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/x', headers: {}, method: 'GET' }),
        getResponse: () => ({ status }),
      }),
    } as any;

    filter.catch(new BadRequestException({ message: ['uno', 'dos'], error: 'Solicitud inválida', code: 'E_X' }), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      error: 'Solicitud inválida',
      errors: ['uno', 'dos'],
      code: 'E_X',
    }));
  });

  it('handles unknown error in AppExceptionFilter', () => {
    const logging = jest.requireActual('../../../backend/src/common/logging.utils');
    jest.spyOn(logging, 'writeAppLog').mockImplementation(() => undefined);
    const filter = new AppExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/x', headers: {}, method: 'GET' }),
        getResponse: () => ({ status }),
      }),
    } as any;

    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500, message: 'Error interno del servidor' }));
  });

  it('handles MulterExceptionFilter directly', () => {
    const filter = new MulterExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as any;

    filter.catch(new MulterError('LIMIT_PART_COUNT', 'file'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: expect.any(String), code: 'LIMIT_PART_COUNT' });
  });

  it('records metrics and logs in RequestLoggingInterceptor', async () => {
    const metrics = { normalizePath: jest.fn().mockReturnValue('/documents/:id'), recordHttpRequest: jest.fn() };
    const prom = { recordHttpRequest: jest.fn() };
    const logging = jest.requireActual('../../../backend/src/common/logging.utils');
    jest.spyOn(logging, 'writeAppLog').mockImplementation(() => undefined);
    const requestContext = jest.requireActual('../../../backend/src/common/request-context');
    jest.spyOn(requestContext, 'getRequestId').mockReturnValue('req-999');
    const interceptor = new RequestLoggingInterceptor(metrics as any, prom as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', originalUrl: '/documents/1', url: '/documents/1' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as any;
    const next = { handle: () => of({ ok: true }) } as any;

    await lastValueFrom(interceptor.intercept(context, next));
    await new Promise((resolve) => setImmediate(resolve));

    expect(metrics.recordHttpRequest).toHaveBeenCalled();
    expect(prom.recordHttpRequest).toHaveBeenCalledWith(expect.objectContaining({ route: '/documents/:id', statusCode: 200 }));
    expect(logging.writeAppLog).toHaveBeenCalledWith(expect.objectContaining({ event: 'http_request' }));
  });
});
