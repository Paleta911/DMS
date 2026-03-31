import { VersionTextSource } from '../versions/version-text-source.enum';

export type DocumentTextExtractionResult = {
  contentText: string | null;
  textSource: VersionTextSource;
  ocrApplied: boolean;
  ocrPageCount: number | null;
};
