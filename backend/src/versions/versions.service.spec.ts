import { Test, TestingModule } from '@nestjs/testing';
import { VersionsService } from './versions.service';
import { VersionsQueryService } from './versions-query.service';
import { VersionsMutationService } from './versions-mutation.service';

describe('VersionsService', () => {
  let service: VersionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        {
          provide: VersionsQueryService,
          useValue: {},
        },
        {
          provide: VersionsMutationService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
