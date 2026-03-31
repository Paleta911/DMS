import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { HttpAuditService } from '../audit-log/http-audit.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  const categoriesService = {
    create: jest.fn().mockResolvedValue({ id: 1, nombre: 'Calidad' }),
    update: jest.fn().mockResolvedValue({ id: 1, nombre: 'Calidad 2' }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
    findAll: jest.fn().mockResolvedValue([]),
  };
  const httpAuditService = {
    logFromRequest: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: categoriesService,
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: () => true },
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: () => true },
        },
        {
          provide: HttpAuditService,
          useValue: httpAuditService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('logs audit metadata on create', async () => {
    await controller.create(
      { nombre: 'Calidad' } as never,
      { user: { id: 9 }, ip: '127.0.0.1', headers: {} } as never,
    );

    expect(httpAuditService.logFromRequest).toHaveBeenCalledWith(
      expect.anything(),
      {
        action: 'CATEGORY_CREATED',
        resourceType: 'category',
        resourceId: 1,
        meta: { nombre: 'Calidad' },
      },
    );
  });
});
