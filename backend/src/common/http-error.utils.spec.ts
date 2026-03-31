import {
  buildApiErrorResponse,
  collectValidationMessages,
  createValidationException,
  mapMulterMessage,
  normalizeApiMessage,
  translateValidationMessage,
} from './http-error.utils';

describe('http-error.utils', () => {
  it('traduce mensajes de validacion comunes', () => {
    expect(translateValidationMessage('email must be an email')).toBe(
      'email debe ser un correo válido',
    );
    expect(
      translateValidationMessage('password must be longer than or equal to 6 characters'),
    ).toBe('password debe tener al menos 6 caracteres');
  });

  it('normaliza mensajes heredados con acentos', () => {
    expect(normalizeApiMessage('Credenciales invalidas')).toBe(
      'Credenciales inválidas',
    );
    expect(normalizeApiMessage('Categoria no encontrada')).toBe(
      'Categoría no encontrada',
    );
  });

  it('extrae y empaqueta errores de validacion', () => {
    const exception = createValidationException([
      {
        property: 'email',
        constraints: { isEmail: 'email must be an email' },
        children: [],
      } as any,
      {
        property: 'password',
        constraints: {
          minLength: 'password must be longer than or equal to 6 characters',
        },
        children: [],
      } as any,
    ]);

    const payload = exception.getResponse() as any;
    expect(payload.code).toBe('VALIDATION_ERROR');
    expect(payload.errors).toEqual([
      'email debe ser un correo válido',
      'password debe tener al menos 6 caracteres',
    ]);
  });

  it('mapea errores de multer y construye contrato uniforme', () => {
    const response = buildApiErrorResponse({
      statusCode: 400,
      error: 'Solicitud inválida',
      message: mapMulterMessage('LIMIT_FILE_SIZE', 'File too large'),
      code: 'LIMIT_FILE_SIZE',
      request: {
        originalUrl: '/documents',
        requestId: 'req-1',
      } as any,
    });

    expect(response).toMatchObject({
      statusCode: 400,
      error: 'Solicitud inválida',
      message: 'El archivo excede el tamaño máximo permitido',
      code: 'LIMIT_FILE_SIZE',
      path: '/documents',
      requestId: 'req-1',
    });
  });

  it('aplana errores anidados de class-validator', () => {
    const messages = collectValidationMessages([
      {
        property: 'payload',
        children: [
          {
            property: 'email',
            constraints: { isEmail: 'email must be an email' },
            children: [],
          },
        ],
      } as any,
    ]);

    expect(messages).toEqual(['payload.email debe ser un correo válido']);
  });
});
