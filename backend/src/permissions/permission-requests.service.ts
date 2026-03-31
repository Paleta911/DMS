import { Injectable } from '@nestjs/common';
import {
  PermissionRequestStatus,
  PermissionRequestType,
} from './permission-request.entity';
import { PermissionKey } from '../users/permissions';
import { PermissionRequestsCreateService } from './permission-requests-create.service';
import { PermissionRequestsQueryService } from './permission-requests-query.service';
import { PermissionRequestsReviewService } from './permission-requests-review.service';

@Injectable()
export class PermissionRequestsService {
  constructor(
    private readonly createService: PermissionRequestsCreateService,
    private readonly queryService: PermissionRequestsQueryService,
    private readonly reviewService: PermissionRequestsReviewService,
  ) {}

  async createRequest(params: {
    userId: number;
    permissions: PermissionKey[];
    comment?: string;
    ip?: string;
    userAgent?: string;
  }) {
    return this.createService.createRequest(params);
  }

  async createAreaRequest(params: {
    userId: number;
    areaCodes: string[];
    comment?: string;
    ip?: string;
    userAgent?: string;
  }) {
    return this.createService.createAreaRequest(params);
  }

  async listMine(userId: number, params?: { page?: number; limit?: number }) {
    return this.queryService.listMine(userId, params);
  }

  async listAll(params: {
    status?: PermissionRequestStatus;
    type?: PermissionRequestType;
    user?: string;
    detail?: string;
    page?: number;
    limit?: number;
  }) {
    return this.queryService.listAll(params);
  }

  async exportCsv(params: {
    status?: PermissionRequestStatus;
    type?: PermissionRequestType;
    user?: string;
    detail?: string;
    maxRows?: number;
  }) {
    return this.queryService.exportCsv(params);
  }

  async getById(id: number) {
    return this.queryService.getById(id);
  }

  async approveRequest(params: { id: number; adminId: number; ip?: string; userAgent?: string }) {
    return this.reviewService.approveRequest(params);
  }

  async approvePartialAreaRequest(params: {
    id: number;
    adminId: number;
    areaCodes: string[];
    note?: string;
    ip?: string;
    userAgent?: string;
  }) {
    return this.reviewService.approvePartialAreaRequest(params);
  }

  async rejectRequest(params: { id: number; adminId: number; reason?: string; ip?: string; userAgent?: string }) {
    return this.reviewService.rejectRequest(params);
  }
}
