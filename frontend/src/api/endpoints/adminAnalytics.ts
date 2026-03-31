import { http } from '../http';
import type { AdminAnalyticsSummary } from '../../types/analytics';

export async function adminAnalyticsSummary() {
  const { data } = await http.get<AdminAnalyticsSummary>(
    '/admin/analytics/summary',
  );
  return data;
}
