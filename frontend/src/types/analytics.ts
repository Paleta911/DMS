export type AnalyticsBucket = {
  label: string;
  count: number;
};

export type AdminAnalyticsSummary = {
  generatedAt: string;
  windows: {
    last24h: string;
    last7d: string;
    last30d: string;
  };
  documents: {
    total: number;
    createdLast7d: number;
    byStatus: AnalyticsBucket[];
    topAreas: AnalyticsBucket[];
  };
  registrations: {
    byStatus: AnalyticsBucket[];
    approvedLast30d: number;
    pendingApproval: number;
  };
  permissionRequests: {
    totalPending: number;
    byStatus: AnalyticsBucket[];
    byType: AnalyticsBucket[];
  };
  audit: {
    totalLast24h: number;
    accessDeniedLast24h: number;
    topActionsLast7d: AnalyticsBucket[];
  };
  search: {
    elasticStatus: 'up' | 'down' | 'unknown';
    queue: {
      pendingJobs: number;
      dueJobs: number;
      oldestJobAgeMs: number | null;
      processing: boolean;
      workerRunning: boolean;
    };
    counters: {
      queued: number;
      indexed: number;
      indexFailures: number;
      retries: number;
      dropped: number;
      queryElastic: number;
      queryFallback: number;
      reindexRuns: number;
      reindexDocs: number;
      reindexFailures: number;
      elasticDownEvents: number;
    };
  };
};
