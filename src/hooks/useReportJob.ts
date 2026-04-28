"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { reportsApi } from "@/lib/api/reports";
import { getApiErrorMessage } from "@/lib/utils";
import type { ReportFormat, ReportOutput, ReportStatus, ReportType } from "@/types";

interface UseReportJobResult {
  output: ReportOutput | null;
  status: ReportStatus | null;
  isPolling: boolean;
  error: string | null;
  trigger: (params: {
    report_type: ReportType;
    format: ReportFormat;
    date_from?: string;
    date_to?: string;
    aerodrome_id?: string;
  }) => Promise<void>;
  reset: () => void;
}

export function useReportJob(): UseReportJobResult {
  const [output, setOutput] = useState<ReportOutput | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollStatus = useCallback(async (id: string) => {
    try {
      const { data } = await reportsApi.get(id);
      setOutput(data);
      if (data.status === "completed" || data.status === "failed") {
        stopPolling();
      }
    } catch {
      stopPolling();
      setError("Failed to check report status");
    }
  }, [stopPolling]);

  const trigger = useCallback(async (params: Parameters<typeof reportsApi.generate>[0]) => {
    setError(null);
    setOutput(null);
    try {
      const { data } = await reportsApi.generate(params);
      setOutput(data);
      setIsPolling(true);
      intervalRef.current = setInterval(() => pollStatus(data.id), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to start report generation"));
    }
  }, [pollStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setOutput(null);
    setError(null);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { output, status: output?.status ?? null, isPolling, error, trigger, reset };
}
