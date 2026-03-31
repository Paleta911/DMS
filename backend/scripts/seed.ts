import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { DocumentType } from '../src/document-types/document-type.entity';
import { AreaCode } from '../src/area-codes/area-code.entity';

const DOCUMENT_TYPES = [
  { code: 'MGCI', nombreLargo: 'Manual de Gestion de Calidad Integrado' },
  { code: 'MC', nombreLargo: 'Manual de Calidad' },
  { code: 'PRO', nombreLargo: 'Procedimiento' },
  { code: 'FOR', nombreLargo: 'Formato' },
  { code: 'INS', nombreLargo: 'Instructivo' },
  { code: 'TA', nombreLargo: 'Tarea' },
  { code: 'PVM', nombreLargo: 'Plan de Verificacion y Medicion' },
  { code: 'PGR', nombreLargo: 'Programa' },
  { code: 'CROC', nombreLargo: 'Cronograma' },
  { code: 'PC', nombreLargo: 'Plan de Calidad' },
];

const AREA_CODES = [
  { code: 'RC', nombre: 'Recursos Humanos' },
  { code: 'FA', nombre: 'Finanzas' },
  { code: 'SIS', nombre: 'Sistemas' },
  { code: 'LF', nombre: 'Legal' },
  { code: 'LC', nombre: 'Logistica' },
  { code: 'CPO', nombre: 'Compras' },
  { code: 'MG', nombre: 'Mantenimiento' },
  { code: 'ME', nombre: 'Mecanica' },
  { code: 'MM', nombre: 'Mantenimiento Mecanico' },
  { code: 'GA', nombre: 'Gerencia Administrativa' },
  { code: 'SA', nombre: 'Seguridad y Ambiente' },
];

export async function runSeed() {
  await AppDataSource.initialize();
  const documentTypeRepo = AppDataSource.getRepository(DocumentType);
  const areaCodeRepo = AppDataSource.getRepository(AreaCode);

  for (const type of DOCUMENT_TYPES) {
    const exists = await documentTypeRepo.findOne({
      where: { code: type.code },
    });
    if (!exists) {
      await documentTypeRepo.save({
        code: type.code,
        nombreLargo: type.nombreLargo,
        activo: true,
      });
    }
  }

  for (const area of AREA_CODES) {
    const exists = await areaCodeRepo.findOne({
      where: { code: area.code },
    });
    if (!exists) {
      await areaCodeRepo.save({
        code: area.code,
        nombre: area.nombre,
        activo: true,
      });
    }
  }

  await AppDataSource.destroy();
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('[seed] completed');
    })
    .catch((error) => {
      console.error('[seed] failed:', error.message);
      process.exit(1);
    });
}
