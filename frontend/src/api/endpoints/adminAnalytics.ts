// Admin analytics API: fetch system-wide metrics and performance summaries
import { http } from "../http";
import type { AdminAnalyticsSummary } from "../../types/analytics";

// Get dashboard metrics: user counts by status, document counts by status, approval bottlenecks, etc.
export async function adminAnalyticsSummary() {
  const { data } = await http.get<AdminAnalyticsSummary>(
    "/admin/analytics/summary",
  );
  return data;
}
