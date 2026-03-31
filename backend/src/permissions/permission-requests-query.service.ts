import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PermissionRequest,
  PermissionRequestStatus,
  PermissionRequestType,
} from './permission-request.entity';

@Injectable()
export class PermissionRequestsQueryService {
  constructor(
    @InjectRepository(PermissionRequest)
    private readonly requestRepo: Repository<PermissionRequest>,
  ) {}

  async listMine(userId: number, params?: { page?: number; limit?: number }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;
    const [items, total] = await this.requestRepo.findAndCount({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async listAll(params: {
    status?: PermissionRequestStatus;
    type?: PermissionRequestType;
    user?: string;
    detail?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const [items, total] = await this.buildAdminQuery(params)
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  async exportCsv(params: {
    status?: PermissionRequestStatus;
    type?: PermissionRequestType;
    user?: string;
    detail?: string;
    maxRows?: number;
  }) {
    const maxRows = Math.min(Math.max(params.maxRows ?? 5000, 1), 10000);
    const items = await this.buildAdminQuery(params).take(maxRows).getMany();
    const headers = [
      'id',
      'usuario',
      'tipo',
      'estado',
      'detalle',
      'comentario',
      'motivoRevision',
      'revisadoPor',
      'revisadoEn',
      'creadoEn',
    ];

    const lines = items.map((item) =>
      [
        item.id,
        item.user?.email ?? '',
        item.requestType,
        item.status,
        this.requestDetail(item),
        item.comment ?? '',
        item.reviewReason ?? '',
        item.reviewedById ?? '',
        item.reviewedAt?.toISOString?.() ?? '',
        item.createdAt.toISOString(),
      ]
        .map((value) => this.toCsvCell(value))
        .join(','),
    );

    return [headers.map((header) => this.toCsvCell(header)).join(','), ...lines].join('\n');
  }

  async getById(id: number) {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return request;
  }

  private buildAdminQuery(params: {
    status?: PermissionRequestStatus;
    type?: PermissionRequestType;
    user?: string;
    detail?: string;
  }) {
    const qb = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .orderBy('request.createdAt', 'DESC');
    if (params.status) {
      qb.andWhere('request.status = :status', { status: params.status });
    }
    if (params.type) {
      qb.andWhere('request.requestType = :type', { type: params.type });
    }
    if (params.user?.trim()) {
      qb.andWhere('LOWER(user.email) LIKE :userFilter', {
        userFilter: `%${params.user.trim().toLowerCase()}%`,
      });
    }
    if (params.detail?.trim()) {
      const detailFilter = `%${params.detail.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(request.requestedPermissions) LIKE :detailFilter OR LOWER(request.requestedAreaCodes) LIKE :detailFilter)',
        { detailFilter },
      );
    }
    return qb;
  }

  private requestDetail(item: PermissionRequest) {
    if (item.requestType === PermissionRequestType.Areas) {
      return item.requestedAreaCodes ?? '';
    }
    return item.requestedPermissions ?? '';
  }

  private toCsvCell(value: unknown) {
    const normalized =
      value === null || value === undefined
        ? ''
        : String(value).replace(/\r?\n/g, ' ');
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
