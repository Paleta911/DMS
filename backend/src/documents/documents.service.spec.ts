import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { Document } from './document.entity';
import { Version } from '../versions/version.entity';
import { Category } from '../categories/category.entity';
import { User } from '../users/user.entity';
import { DocumentType } from '../document-types/document-type.entity';
import { AreaCode } from '../area-codes/area-code.entity';
import { SearchService } from '../search/search.service';
import { DocumentApproval } from './document-approval.entity';
import { DocumentsFileService } from './documents-file.service';
import { DocumentsAccessService } from './documents-access.service';
import { DocumentsWorkflowService } from './documents-workflow.service';
import { DocumentsQueryService } from './documents-query.service';
import { DocumentsMutationService } from './documents-mutation.service';
import { DocumentsContentMaintenanceService } from './documents-content-maintenance.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Version),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(DocumentType),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AreaCode),
          useValue: {},
        },
        {
          provide: SearchService,
          useValue: {},
        },
        {
          provide: getRepositoryToken(DocumentApproval),
          useValue: {},
        },
        {
          provide: DocumentsFileService,
          useValue: {},
        },
        {
          provide: DocumentsQueryService,
          useValue: {},
        },
        {
          provide: DocumentsMutationService,
          useValue: {},
        },
        {
          provide: DocumentsAccessService,
          useValue: {},
        },
        {
          provide: DocumentsWorkflowService,
          useValue: {},
        },
        {
          provide: DocumentsContentMaintenanceService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
