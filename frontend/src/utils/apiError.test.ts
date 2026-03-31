import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './apiError';

describe('getApiErrorMessage', () => {
  it('usa message array de API cuando existe', () => {
    const error = {
      response: {
        data: {
          message: ['Error A', 'Error B'],
        },
      },
    };
    expect(getApiErrorMessage(error, 'Fallback')).toBe('Error A, Error B');
  });

  it('usa message string de API cuando existe', () => {
    const error = {
      response: {
        data: {
          message: 'No autorizado',
        },
      },
    };
    expect(getApiErrorMessage(error, 'Fallback')).toBe('No autorizado');
  });

  it('usa fallback cuando no hay message interpretable', () => {
    const error = { response: { data: { message: null } } };
    expect(getApiErrorMessage(error, 'Fallback')).toBe('Fallback');
  });

  it('traduce mensajes de validación comunes de class-validator', () => {
    const error = {
      response: {
        data: {
          message: [
            'code must be longer than or equal to 2 characters',
            'nombreLargo must be longer than or equal to 2 characters',
          ],
        },
      },
    };
    expect(getApiErrorMessage(error, 'Fallback')).toBe(
      'code debe tener al menos 2 caracteres, nombreLargo debe tener al menos 2 caracteres',
    );
  });
});
