import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserStatus } from '../users/user-status.enum';

@Injectable()
export class RegistrationsQueryService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async list(params: {
    status?: UserStatus;
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.buildQuery(params)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((user) => ({
        id: user.id,
        email: user.email,
        nombre: user.nombre ?? null,
        primerApellido: user.primerApellido ?? null,
        segundoApellido: user.segundoApellido ?? null,
        telefono: user.telefono ?? null,
        fechaNacimiento: user.fechaNacimiento ?? null,
        status: user.status,
        registeredAt: user.createdAt,
        verifiedAt: user.verifiedAt ?? null,
        sendStatus: user.emailVerification?.sendStatus ?? null,
        sendAttempts: user.emailVerification?.sendAttempts ?? 0,
        lastSentAt: user.emailVerification?.sentAt ?? null,
        lastError: user.emailVerification?.lastError ?? null,
        verifyAttempts: user.emailVerification?.verifyAttempts ?? 0,
        lastAttemptAt: user.emailVerification?.lastAttemptAt ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  async exportCsv(params: {
    status?: UserStatus;
    q?: string;
    maxRows?: number;
  }) {
    const maxRows = Math.min(Math.max(params.maxRows ?? 5000, 1), 10000);
    const items = await this.buildQuery(params).take(maxRows).getMany();
    const headers = [
      'id',
      'correo',
      'nombre',
      'primerApellido',
      'segundoApellido',
      'telefono',
      'fechaNacimiento',
      'estado',
      'registrado',
      'verificado',
      'envioEstado',
      'envios',
      'ultimoEnvio',
      'errorUltimoEnvio',
      'intentosVerificacion',
      'ultimoIntento',
    ];

    const lines = items.map((user) =>
      [
        user.id,
        user.email,
        user.nombre ?? '',
        user.primerApellido ?? '',
        user.segundoApellido ?? '',
        user.telefono ?? '',
        user.fechaNacimiento?.toISOString?.() ?? user.fechaNacimiento ?? '',
        user.status,
        user.createdAt.toISOString(),
        user.verifiedAt?.toISOString?.() ?? '',
        user.emailVerification?.sendStatus ?? '',
        user.emailVerification?.sendAttempts ?? 0,
        user.emailVerification?.sentAt?.toISOString?.() ?? '',
        user.emailVerification?.lastError ?? '',
        user.emailVerification?.verifyAttempts ?? 0,
        user.emailVerification?.lastAttemptAt?.toISOString?.() ?? '',
      ]
        .map((value) => this.toCsvCell(value))
        .join(','),
    );

    return [headers.map((header) => this.toCsvCell(header)).join(','), ...lines].join('\n');
  }

  private buildQuery(params: {
    status?: UserStatus;
    q?: string;
  }) {
    const q = params.q?.trim();
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.emailVerification', 'verification')
      .orderBy('user.createdAt', 'DESC');

    if (params.status) {
      qb.andWhere('user.status = :status', { status: params.status });
    }

    if (q) {
      qb.andWhere(
        `
          (
            LOWER(user.email) LIKE :q
            OR LOWER(COALESCE(user.nombre, '')) LIKE :q
            OR LOWER(COALESCE(user.primerApellido, '')) LIKE :q
            OR LOWER(COALESCE(user.segundoApellido, '')) LIKE :q
          )
        `,
        { q: `%${q.toLowerCase()}%` },
      );
    }

    return qb;
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
