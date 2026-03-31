import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListCatalogDto } from '../../../backend/src/common/dto/list-catalog.dto';
import { CreatePermissionRequestDto } from '../../../backend/src/permissions/dto/create-permission-request.dto';
import { CreateAreaRequestDto } from '../../../backend/src/permissions/dto/create-area-request.dto';
import { RegistrationsQueryDto } from '../../../backend/src/admin/dto/registrations-query.dto';
import { CreateAreaCodeDto } from '../../../backend/src/area-codes/dto/create-area-code.dto';
import { CreateDocumentTypeDto } from '../../../backend/src/document-types/dto/create-document-type.dto';
import { PermissionKey } from '../../../backend/src/users/permissions';

function messages(errors: ReturnType<typeof validateSync>) {
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('DTO validation external tests', () => {
  it('transforms and validates ListCatalogDto', () => {
    const dto = plainToInstance(ListCatalogDto, {
      q: 'abc',
      includeInactive: 'true',
      page: '2',
      limit: '10',
    });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.includeInactive).toBe(true);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('rejects invalid ListCatalogDto pagination', () => {
    const dto = plainToInstance(ListCatalogDto, { page: '0', limit: '200' });
    const result = validateSync(dto);
    expect(messages(result).join(' ')).toContain('must not be less than 1');
  });

  it('validates CreatePermissionRequestDto', () => {
    const invalid = plainToInstance(CreatePermissionRequestDto, { permissions: [] });
    expect(messages(validateSync(invalid)).join(' ')).toContain('Selecciona al menos un permiso.');

    const valid = plainToInstance(CreatePermissionRequestDto, { permissions: [PermissionKey.Read], comment: 'ok' });
    expect(validateSync(valid)).toEqual([]);
  });

  it('validates CreateAreaRequestDto', () => {
    const invalid = plainToInstance(CreateAreaRequestDto, { areaCodes: [] });
    expect(messages(validateSync(invalid)).join(' ')).toContain('Selecciona al menos un área.');

    const valid = plainToInstance(CreateAreaRequestDto, { areaCodes: ['FA'], comment: 'x' });
    expect(validateSync(valid)).toEqual([]);
  });

  it('validates RegistrationsQueryDto', () => {
    const dto = plainToInstance(RegistrationsQueryDto, { page: 0, limit: 101, maxRows: 10001 });
    const result = messages(validateSync(dto)).join(' ');
    expect(result).toContain('must not be less than 1');
    expect(result).toContain('must not be greater than 100');
  });

  it('validates catalog DTOs', () => {
    const area = plainToInstance(CreateAreaCodeDto, { code: 'F', nombre: 'x' });
    const docType = plainToInstance(CreateDocumentTypeDto, { code: 'P', nombreLargo: 'y' });
    expect(validateSync(area).length).toBeGreaterThan(0);
    expect(validateSync(docType).length).toBeGreaterThan(0);
  });
});
