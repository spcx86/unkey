"use client";

import { KeysOverviewLogDetails } from "@/components/api-requests-table/components/log-details";
import { trpc } from "@/lib/trpc/client";
import type { KeysOverviewLog } from "@unkey/clickhouse/src/keys/keys";
import { useCallback, useState } from "react";
import { KeysOverviewLogsCharts } from "./components/charts";
import { KeysOverviewLogsControlCloud } from "./components/control-cloud";
import { KeysOverviewLogsControls } from "./components/controls";
import { NoKeysEmptyState } from "./components/table/logs-table";
import { KeysOverviewLogsTable } from "./components/table/logs-table";

export const LogsClient = ({ apiId }: { apiId: string }) => {
  const [selectedLog, setSelectedLog] = useState<KeysOverviewLog | null>(null);
  const [tableDistanceToTop, setTableDistanceToTop] = useState(0);
  const { data: keyCountData } = trpc.api.overview.keyCount.useQuery({ apiId });
  const hasKeys = keyCountData ? keyCountData.count > 0 : true;

  const handleDistanceToTop = useCallback((distanceToTop: number) => {
    setTableDistanceToTop(distanceToTop);
  }, []);

  const handleSelectedLog = useCallback((log: KeysOverviewLog | null) => {
    setSelectedLog(log);
  }, []);

  return (
    <div className="flex flex-col">
      {!hasKeys && (
        <div className="px-5 border-b border-gray-4">
          <NoKeysEmptyState apiId={apiId} />
        </div>
      )}
      {hasKeys && (
        <>
          <KeysOverviewLogsControls apiId={apiId} />
          <KeysOverviewLogsControlCloud />
        </>
      )}
      <div className="flex flex-col">
        <KeysOverviewLogsCharts apiId={apiId} onMount={handleDistanceToTop} hasKeys={hasKeys} />
        <KeysOverviewLogsTable apiId={apiId} setSelectedLog={handleSelectedLog} log={selectedLog} />
      </div>
      <KeysOverviewLogDetails
        apiId={apiId}
        distanceToTop={tableDistanceToTop}
        setSelectedLog={handleSelectedLog}
        log={selectedLog}
      />
    </div>
  );
};
