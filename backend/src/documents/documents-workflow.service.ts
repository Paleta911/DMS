import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { assertAssignmentEligibility } from '../users/user-access.policy';
import { SearchService } from '../search/search.service';
import {
  ApprovalDecision,
  ApprovalStep,
  DocumentApproval,
} from './document-approval.entity';
import { DocumentStatus } from './document-status.enum';
import { Document } from './document.entity';

@Injectable()
export class DocumentsWorkflowService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentApproval)
    private readonly approvalRepo: Repository<DocumentApproval>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly searchService: SearchService,
  ) {}

  async ensureWorkflowForUpload(
    document: Document,
    createdBy: User | null,
    wasApproved: boolean,
  ) {
    if (!document.approvals || document.approvals.length === 0) {
      await this.initializeApprovals(document, createdBy);
      return;
    }

    if (wasApproved) {
      await this.resetApprovals(document);
    }
  }

  async getWorkflow(documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['approvals', 'approvals.user'],
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }
    return {
      status: document.status,
      approvals: document.approvals ?? [],
    };
  }

  async assignReviewers(
    documentId: number,
    revisoUserId: number,
    aproboUserId: number,
  ) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['approvals'],
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }
    const revisoUser = await this.userRepo.findOne({
      where: { id: revisoUserId },
    });
    const aproboUser = await this.userRepo.findOne({
      where: { id: aproboUserId },
    });
    if (!revisoUser || !aproboUser) {
      throw new NotFoundException('Usuario no encontrado');
    }
    this.ensureAssignmentUser(revisoUser, 'review');
    this.ensureAssignmentUser(aproboUser, 'approve');

    await this.ensureApproval(document, ApprovalStep.Reviso, revisoUser);
    await this.ensureApproval(document, ApprovalStep.Aprobo, aproboUser);

    return this.getWorkflow(documentId);
  }

  async submitReview(documentId: number, actorId: number, isAdmin: boolean) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['approvals', 'approvals.user', 'createdBy'],
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (!isAdmin && document.createdBy?.id !== actorId) {
      throw new ForbiddenException('No autorizado');
    }

    const reviso = document.approvals?.find(
      (approval) => approval.step === ApprovalStep.Reviso,
    );
    const aprobo = document.approvals?.find(
      (approval) => approval.step === ApprovalStep.Aprobo,
    );
    if (!reviso?.user || !aprobo?.user) {
      throw new BadRequestException('Debe asignar reviso y aprobo');
    }

    await this.resetApprovals(document);
    document.status = DocumentStatus.InReview;
    await this.documentRepo.save(document);
    this.searchService.enqueueIndexDocument(document.id);
    return this.getWorkflow(documentId);
  }

  async reviewDecision(params: {
    documentId: number;
    actorId: number;
    decision: ApprovalDecision;
    comentario?: string;
    step: ApprovalStep;
  }) {
    const document = await this.documentRepo.findOne({
      where: { id: params.documentId },
      relations: ['approvals', 'approvals.user'],
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }
    const approval = document.approvals?.find(
      (item) => item.step === params.step,
    );
    if (!approval?.user || approval.user.id !== params.actorId) {
      throw new ForbiddenException('No autorizado');
    }

    approval.decision = params.decision;
    approval.comentario = params.comentario ?? null;
    approval.decidedAt = new Date();
    await this.approvalRepo.save(approval);

    if (params.decision === ApprovalDecision.Rejected) {
      document.status = DocumentStatus.Draft;
      await this.documentRepo.save(document);
      this.searchService.enqueueIndexDocument(document.id);
    } else if (
      params.step === ApprovalStep.Aprobo &&
      params.decision === ApprovalDecision.Approved
    ) {
      document.status = DocumentStatus.Approved;
      await this.documentRepo.save(document);
      this.searchService.enqueueIndexDocument(document.id);
    }

    return this.getWorkflow(params.documentId);
  }

  async markObsolete(documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }
    document.status = DocumentStatus.Obsolete;
    await this.documentRepo.save(document);
    this.searchService.enqueueIndexDocument(document.id);
    return this.getWorkflow(documentId);
  }

  private ensureAssignmentUser(user: User, kind: 'review' | 'approve') {
    assertAssignmentEligibility(user, kind);
  }

  private async initializeApprovals(document: Document, createdBy: User | null) {
    const approvals: DocumentApproval[] = [
      this.approvalRepo.create({
        document,
        step: ApprovalStep.Elaboro,
        user: createdBy ?? null,
        decision: ApprovalDecision.Pending,
      }),
      this.approvalRepo.create({
        document,
        step: ApprovalStep.Reviso,
        user: null,
        decision: ApprovalDecision.Pending,
      }),
      this.approvalRepo.create({
        document,
        step: ApprovalStep.Aprobo,
        user: null,
        decision: ApprovalDecision.Pending,
      }),
    ];
    await this.approvalRepo.save(approvals);
  }

  private async ensureApproval(
    document: Document,
    step: ApprovalStep,
    user: User,
  ) {
    let approval = document.approvals?.find((item) => item.step === step);
    if (!approval) {
      approval = this.approvalRepo.create({
        document,
        step,
        decision: ApprovalDecision.Pending,
      });
    }
    approval.user = user;
    approval.decision = ApprovalDecision.Pending;
    approval.comentario = null;
    approval.decidedAt = null;
    await this.approvalRepo.save(approval);
  }

  private async resetApprovals(document: Document) {
    const approvals = await this.approvalRepo.find({
      where: { document: { id: document.id } },
    });
    for (const approval of approvals) {
      approval.decision = ApprovalDecision.Pending;
      approval.comentario = null;
      approval.decidedAt = null;
    }
    await this.approvalRepo.save(approvals);
    document.status = DocumentStatus.Draft;
    await this.documentRepo.save(document);
  }
}
