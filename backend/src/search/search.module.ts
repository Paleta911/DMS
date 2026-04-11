import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Document } from '../documents/document.entity';
import { Version } from '../versions/version.entity';
import { getEnv } from '../common/env.utils';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersModule } from '../users/users.module';
import { SearchStateService } from './search-state.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ObservabilityModule } from '../observability/observability.module';
import { SearchIndexJob } from './search-index-job.entity';
import { SearchEngineService } from './search-engine.service';
import { SearchIndexingService } from './search-indexing.service';
import { SearchQueryService } from './search-query.service';
import { DocumentVisibilityModule } from '../document-visibility/document-visibility.module';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      useFactory: () => ({
        node: getEnv('ES_NODE', 'http://localhost:9200'),
      }),
    }),
    TypeOrmModule.forFeature([Document, Version, SearchIndexJob]),
    AuditLogModule,
    UsersModule,
    ObservabilityModule,
    DocumentVisibilityModule,
  ],
  providers: [
    SearchService,
    SearchEngineService,
    SearchIndexingService,
    SearchQueryService,
    SearchStateService,
    PermissionsGuard,
  ],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
