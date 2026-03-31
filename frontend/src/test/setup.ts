import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { queryClient } from '../app/queryClient';

afterEach(() => {
  cleanup();
  queryClient.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
