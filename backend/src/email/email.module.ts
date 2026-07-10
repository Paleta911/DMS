import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

// Email module exports delivery service for verification and notification workflows.
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
