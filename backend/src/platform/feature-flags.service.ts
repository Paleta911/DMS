import { Injectable, NotFoundException } from '@nestjs/common';

export type AppFeatureFlag =
  | 'audit-json-export'
  | 'admin-analytics'
  | 'notifications'
  | 'saved-views'
  | 'advanced-exports'
  | 'dark-mode'
  | 'i18n';

export const DEFAULT_FEATURE_FLAGS: AppFeatureFlag[] = [
  'audit-json-export',
  'admin-analytics',
  'notifications',
  'saved-views',
  'advanced-exports',
  'dark-mode',
  'i18n',
];

// Feature flag service enables toggling app capabilities (audit exports, analytics, i18n, dark mode, etc.) via environment config
@Injectable()
export class FeatureFlagsService {
  private readonly flags: Set<string>;

  constructor() {
    // Load flags from FEATURE_FLAGS env var (comma-separated) or use defaults if not provided
    const raw = process.env.FEATURE_FLAGS?.trim();
    const source =
      raw && raw.length > 0
        ? raw.split(',').map((value) => value.trim())
        : DEFAULT_FEATURE_FLAGS;
    this.flags = new Set(source.filter(Boolean));
  }

  isEnabled(flag: AppFeatureFlag | string) {
    return this.flags.has(flag.trim());
  }

  assertEnabled(flag: AppFeatureFlag | string, message: string) {
    if (!this.isEnabled(flag)) {
      throw new NotFoundException(message);
    }
  }

  getSnapshot() {
    return {
      enabled: Array.from(this.flags.values()).sort(),
    };
  }
}
