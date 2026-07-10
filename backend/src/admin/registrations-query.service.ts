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
    // Pagina resultados de registro sobre un query base compartido con export.
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
        areaLabel: this.buildAreaLabel(user),
        requestedAreaNombre: user.requestedAreaNombre ?? null,
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
    // Limita el volumen exportado para evitar consultas/cargas excesivas.
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
      'area',
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
        this.buildAreaExportValue(user),
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

    return [
      headers.map((header) => this.toCsvCell(header)).join(','),
      ...lines,
    ].join('\n');
  }

  private buildQuery(params: { status?: UserStatus; q?: string }) {
    // Reutiliza un unico query builder para filtros de lista y export.
    const q = params.q?.trim();
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.emailVerification', 'verification')
      .leftJoinAndSelect('user.allowedAreaCodes', 'areaCode')
      .distinct(true)
      .orderBy('user.createdAt', 'DESC')
      .andWhere('user.status <> :deletedStatus', {
        deletedStatus: UserStatus.Deleted,
      });

    if (params.status) {
      qb.andWhere('user.status = :status', { status: params.status });
    }

    if (q) {
      // La busqueda textual cubre datos de identidad y datos de area solicitada/asignada.
      qb.andWhere(
        `
          (
            LOWER(user.email) LIKE :q
            OR LOWER(COALESCE(user.nombre, '')) LIKE :q
            OR LOWER(COALESCE(user.primerApellido, '')) LIKE :q
            OR LOWER(COALESCE(user.segundoApellido, '')) LIKE :q
            OR LOWER(COALESCE(user.requestedAreaNombre, '')) LIKE :q
            OR LOWER(COALESCE(areaCode.code, '')) LIKE :q
            OR LOWER(COALESCE(areaCode.nombre, '')) LIKE :q
          )
        `,
        { q: `%${q.toLowerCase()}%` },
      );
    }

    return qb;
  }

  private toCsvCell(value: unknown) {
    // Escapa comillas y saltos de linea para producir CSV valido.
    const normalized =
      value === null || value === undefined
        ? ''
        : String(value).replace(/\r?\n/g, ' ');
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private buildAreaLabel(user: User) {
    // Prioriza areas asignadas; si no existen, refleja solicitud libre de area.
    const labels = (user.allowedAreaCodes ?? []).map(
      (area) => `${area.code} - ${area.nombre}`,
    );
    if (labels.length > 0) {
      return labels.join(', ');
    }
    if (user.requestedAreaNombre) {
      return 'Mi área no está en la lista';
    }
    return '-';
  }

  private buildAreaExportValue(user: User) {
    if (user.requestedAreaNombre) {
      return `Mi área no está en la lista: ${user.requestedAreaNombre}`;
    }
    return this.buildAreaLabel(user);
  }
}
