import { Injectable } from '@nestjs/common';
import { UserStatus } from '../users/user-status.enum';
import { RegistrationsActionService } from './registrations-action.service';
import { RegistrationsQueryService } from './registrations-query.service';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly queryService: RegistrationsQueryService,
    private readonly actionService: RegistrationsActionService,
  ) {}

  async list(params: {
    status?: UserStatus;
    page?: number;
    limit?: number;
    q?: string;
  }) {
    return this.queryService.list(params);
  }

  async exportCsv(params: {
    status?: UserStatus;
    q?: string;
    maxRows?: number;
  }) {
    return this.queryService.exportCsv(params);
  }

  async approve(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    return this.actionService.approve(params);
  }

  async reject(params: {
    id: number;
    adminId: number;
    reason?: string;
    ip?: string;
    userAgent?: string;
  }) {
    return this.actionService.reject(params);
  }

  async resendCode(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    return this.actionService.resendCode(params);
  }

  async forceVerify(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    return this.actionService.forceVerify(params);
  }
}
