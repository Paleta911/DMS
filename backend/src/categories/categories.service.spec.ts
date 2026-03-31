import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { CategoriesQueryService } from './categories-query.service';
import { CategoriesMutationService } from './categories-mutation.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CategoriesQueryService,
          useValue: {},
        },
        {
          provide: CategoriesMutationService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
