import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchStateService {
  private lastReindexAt: Date | null = null;
  private lastReindexDurationMs: number | null = null;
  private lastReindexTotal = 0;
  private lastReindexFailed = 0;

  setReindexResult(params: {
    startedAt: Date;
    durationMs: number;
    total: number;
    failed: number;
  }) {
    this.lastReindexAt = params.startedAt;
    this.lastReindexDurationMs = params.durationMs;
    this.lastReindexTotal = params.total;
    this.lastReindexFailed = params.failed;
  }

  getSnapshot() {
    return {
      lastReindexAt: this.lastReindexAt,
      lastReindexDurationMs: this.lastReindexDurationMs,
      lastReindexTotal: this.lastReindexTotal,
      lastReindexFailed: this.lastReindexFailed,
    };
  }
}
