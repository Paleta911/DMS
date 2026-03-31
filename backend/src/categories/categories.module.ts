// src/categories/categories.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesMutationService } from './categories-mutation.service';
import { CategoriesQueryService } from './categories-query.service';
import { Category } from './category.entity';
import { Document } from '../documents/document.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Document]), AuditLogModule],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoriesQueryService,
    CategoriesMutationService,
  ],
})
export class CategoriesModule {}
