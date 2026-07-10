import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { DeletedUserRecord } from './deleted-user-record.entity';
import { User } from './user.entity';

// User deletion registry: maintains permanent deletion records to prevent re-signup with same email and rejected login attempts
// Stores snapshot of user profile at deletion time for compliance/audit trails
@Injectable()
export class UserDeletionRegistryService {
  constructor(
    @InjectRepository(DeletedUserRecord)
    private readonly deletedUserRecordRepo: Repository<DeletedUserRecord>,
  ) {}

  private repository(manager?: EntityManager) {
    return manager
      ? manager.getRepository(DeletedUserRecord)
      : this.deletedUserRecordRepo;
  }

  // Normalize email to lowercase for consistency in deletion lookups
  normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  findByEmail(email: string, manager?: EntityManager) {
    return this.repository(manager).findOne({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async rememberPermanentDeletion(
    user: Pick<
      User,
      | 'id'
      | 'email'
      | 'nombre'
      | 'primerApellido'
      | 'segundoApellido'
      | 'status'
    >,
    deletedById: number,
    manager?: EntityManager,
  ) {
    const repo = this.repository(manager);
    const normalizedEmail = this.normalizeEmail(user.email);
    const current = await repo.findOne({ where: { email: normalizedEmail } });
    const record =
      current ??
      repo.create({
        email: normalizedEmail,
      });

    record.email = normalizedEmail;
    record.nombre = user.nombre ?? null;
    record.primerApellido = user.primerApellido ?? null;
    record.segundoApellido = user.segundoApellido ?? null;
    record.originalUserId = user.id;
    record.lastKnownStatus = user.status;
    record.deletedById = deletedById;
    record.deletedAt = new Date();

    return repo.save(record);
  }
}
