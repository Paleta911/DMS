import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentStatus } from '../documents/document-status.enum';
import { DocumentVisibilityPolicy } from './document-visibility-policy.entity';
import { UpdateDocumentVisibilityDto } from './dto/update-document-visibility.dto';

export type DocumentVisibilityPolicyState = {
  draftVisibleToUsers: boolean;
  inReviewVisibleToUsers: boolean;
  approvedVisibleToUsers: boolean;
  obsoleteVisibleToUsers: boolean;
  updatedAt: string | null;
};

const POLICY_ID = 1;
const CACHE_TTL_MS = 5000;
const DEFAULT_POLICY: Omit<DocumentVisibilityPolicyState, 'updatedAt'> = {
  draftVisibleToUsers: true,
  inReviewVisibleToUsers: true,
  approvedVisibleToUsers: true,
  obsoleteVisibleToUsers: true,
};

@Injectable()
export class DocumentVisibilityService {
  private cache:
    | {
        value: DocumentVisibilityPolicyState;
        expiresAt: number;
      }
    | null = null;

  constructor(
    @InjectRepository(DocumentVisibilityPolicy)
    private readonly policyRepo: Repository<DocumentVisibilityPolicy>,
  ) {}

  async getPolicy(forceRefresh = false): Promise<DocumentVisibilityPolicyState> {
    const now = Date.now();
    if (!forceRefresh && this.cache && this.cache.expiresAt > now) {
      return this.cache.value;
    }

    const policy = await this.findOrCreatePolicy();
    const state = this.serialize(policy);
    this.cache = {
      value: state,
      expiresAt: now + CACHE_TTL_MS,
    };
    return state;
  }

  async updatePolicy(
    patch: UpdateDocumentVisibilityDto,
  ): Promise<DocumentVisibilityPolicyState> {
    const policy = await this.findOrCreatePolicy();
    const next = this.policyRepo.merge(policy, patch);
    const saved = await this.policyRepo.save(next);
    const state = this.serialize(saved);
    this.cache = {
      value: state,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return state;
  }

  async getVisibleStatusesForActor(includeHiddenStatuses = false) {
    if (includeHiddenStatuses) {
      return [
        DocumentStatus.Draft,
        DocumentStatus.InReview,
        DocumentStatus.Approved,
        DocumentStatus.Obsolete,
      ];
    }

    const policy = await this.getPolicy();
    const statuses: DocumentStatus[] = [];
    if (policy.draftVisibleToUsers) statuses.push(DocumentStatus.Draft);
    if (policy.inReviewVisibleToUsers) statuses.push(DocumentStatus.InReview);
    if (policy.approvedVisibleToUsers) statuses.push(DocumentStatus.Approved);
    if (policy.obsoleteVisibleToUsers) statuses.push(DocumentStatus.Obsolete);
    return statuses;
  }

  async assertDocumentVisible(
    status: DocumentStatus,
    includeHiddenStatuses = false,
  ) {
    if (includeHiddenStatuses) {
      return;
    }

    const visibleStatuses = await this.getVisibleStatusesForActor(false);
    if (!visibleStatuses.includes(status)) {
      throw new ForbiddenException('Sin acceso a este documento');
    }
  }

  private async findOrCreatePolicy() {
    const existing = await this.policyRepo.findOne({
      where: { id: POLICY_ID },
    });
    if (existing) {
      return existing;
    }

    const created = this.policyRepo.create({
      id: POLICY_ID,
      ...DEFAULT_POLICY,
    });
    return this.policyRepo.save(created);
  }

  private serialize(policy: DocumentVisibilityPolicy): DocumentVisibilityPolicyState {
    return {
      draftVisibleToUsers: policy.draftVisibleToUsers,
      inReviewVisibleToUsers: policy.inReviewVisibleToUsers,
      approvedVisibleToUsers: policy.approvedVisibleToUsers,
      obsoleteVisibleToUsers: policy.obsoleteVisibleToUsers,
      updatedAt: policy.updatedAt ? policy.updatedAt.toISOString() : null,
    };
  }
}
