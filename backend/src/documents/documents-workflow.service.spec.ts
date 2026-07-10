import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalDecision,
  ApprovalStep,
} from './document-approval.entity';
import { DocumentStatus } from './document-status.enum';
import { DocumentsWorkflowService } from './documents-workflow.service';
import { UserRole } from '../users/user-role.enum';
import { UserStatus } from '../users/user-status.enum';

describe('DocumentsWorkflowService', () => {
  const createdBy = {
    id: 2,
    role: UserRole.User,
    status: UserStatus.Approved,
    canAccess: true,
    canReview: false,
    canApprove: false,
  };
  const reviewer = {
    id: 3,
    role: UserRole.User,
    status: UserStatus.Approved,
    canAccess: true,
    canReview: true,
    canApprove: false,
  };
  const approver = {
    id: 4,
    role: UserRole.User,
    status: UserStatus.Approved,
    canAccess: true,
    canReview: false,
    canApprove: true,
  };

  let documentRepo: { findOne: jest.Mock; save: jest.Mock };
  let approvalRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let searchService: { enqueueIndexDocument: jest.Mock };
  let service: DocumentsWorkflowService;

  beforeEach(() => {
    documentRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };
    approvalRepo = {
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (entity) => entity),
      find: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    searchService = {
      enqueueIndexDocument: jest.fn(),
    };
    service = new DocumentsWorkflowService(
      documentRepo as any,
      approvalRepo as any,
      userRepo as any,
      searchService as any,
    );
  });

  it('creates the default workflow on first upload', async () => {
    const document = { id: 10, approvals: [] };

    await service.ensureWorkflowForUpload(document as any, createdBy as any, false);

    expect(approvalRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ step: ApprovalStep.Elaboro, user: createdBy }),
        expect.objectContaining({ step: ApprovalStep.Reviso, user: null }),
        expect.objectContaining({ step: ApprovalStep.Aprobo, user: null }),
      ]),
    );
  });

  it('requires reviewer and approver before submitting to review', async () => {
    documentRepo.findOne.mockResolvedValue({
      id: 11,
      createdBy,
      status: DocumentStatus.Draft,
      approvals: [
        { step: ApprovalStep.Reviso, user: null },
        { step: ApprovalStep.Aprobo, user: null },
      ],
    });

    await expect(
      service.submitReview(11, createdBy.id, false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reindexa el documento cuando se envia a revision', async () => {
    documentRepo.findOne
      .mockResolvedValueOnce({
        id: 17,
        createdBy,
        status: DocumentStatus.Draft,
        approvals: [
          { step: ApprovalStep.Reviso, user: reviewer },
          { step: ApprovalStep.Aprobo, user: approver },
        ],
      })
      .mockResolvedValueOnce({
        id: 17,
        status: DocumentStatus.InReview,
        approvals: [],
      });
    approvalRepo.find.mockResolvedValue([
      { decision: ApprovalDecision.Pending, comentario: null, decidedAt: null },
    ]);

    await service.submitReview(17, createdBy.id, false);

    expect(searchService.enqueueIndexDocument).toHaveBeenCalledWith(17);
  });

  it('rejects a review decision from a different user', async () => {
    documentRepo.findOne.mockResolvedValue({
      id: 12,
      approvals: [{ step: ApprovalStep.Reviso, user: reviewer }],
    });

    await expect(
      service.reviewDecision({
        documentId: 12,
        actorId: approver.id,
        decision: ApprovalDecision.Approved,
        step: ApprovalStep.Reviso,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a document to draft when review is rejected', async () => {
    const approval = {
      step: ApprovalStep.Reviso,
      user: reviewer,
      decision: ApprovalDecision.Pending,
      comentario: null,
      decidedAt: null,
    };
    const document = {
      id: 13,
      status: DocumentStatus.InReview,
      approvals: [approval],
    };
    documentRepo.findOne
      .mockResolvedValueOnce(document)
      .mockResolvedValueOnce({ ...document, approvals: [approval] });

    await service.reviewDecision({
      documentId: 13,
      actorId: reviewer.id,
      decision: ApprovalDecision.Rejected,
      comentario: 'Falta corregir',
      step: ApprovalStep.Reviso,
    });

    expect(documentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: DocumentStatus.Draft }),
    );
    expect(searchService.enqueueIndexDocument).toHaveBeenCalledWith(13);
  });

  it('marks the document as approved when the approver accepts it', async () => {
    const approval = {
      step: ApprovalStep.Aprobo,
      user: approver,
      decision: ApprovalDecision.Pending,
      comentario: null,
      decidedAt: null,
    };
    const document = {
      id: 14,
      status: DocumentStatus.InReview,
      approvals: [approval],
    };
    documentRepo.findOne
      .mockResolvedValueOnce(document)
      .mockResolvedValueOnce({ ...document, approvals: [approval] });

    await service.reviewDecision({
      documentId: 14,
      actorId: approver.id,
      decision: ApprovalDecision.Approved,
      comentario: 'Correcto',
      step: ApprovalStep.Aprobo,
    });

    expect(documentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: DocumentStatus.Approved }),
    );
    expect(searchService.enqueueIndexDocument).toHaveBeenCalledWith(14);
  });

  it('assigns reviewer and approver users with eligibility checks', async () => {
    documentRepo.findOne.mockResolvedValue({
      id: 15,
      approvals: [],
    });
    userRepo.findOne
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(approver);
    documentRepo.findOne.mockResolvedValueOnce({
      id: 15,
      approvals: [],
    });

    await service.assignReviewers(15, reviewer.id, approver.id);

    expect(approvalRepo.save).toHaveBeenCalledTimes(2);
  });

  it('marks a document as obsolete', async () => {
    documentRepo.findOne
      .mockResolvedValueOnce({
        id: 16,
        status: DocumentStatus.Approved,
      })
      .mockResolvedValueOnce({
        id: 16,
        status: DocumentStatus.Obsolete,
        approvals: [],
      });

    await service.markObsolete(16);

    expect(documentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: DocumentStatus.Obsolete }),
    );
    expect(searchService.enqueueIndexDocument).toHaveBeenCalledWith(16);
  });

  it('fails when the workflow document does not exist', async () => {
    documentRepo.findOne.mockResolvedValue(null);

    await expect(service.getWorkflow(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
