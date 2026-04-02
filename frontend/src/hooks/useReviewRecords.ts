import { useEffect, useState } from "react";
import { buildApiUrl } from "../shared/api";

export type ReviewDecision =
  | "approved"
  | "rejected"
  | "needs_change"
  | "info_only";

export interface ReviewRecord {
  id: number;
  solutionVersionId: number;
  decision: ReviewDecision;
  comment: string;
  reviewerName?: string;
  createdAt: string;
}

export interface CreateReviewRecordInput {
  decision: ReviewDecision;
  comment: string;
}

interface UseReviewRecordsOptions {
  accessToken: string | null;
  solutionVersionId: number | null;
  useMock: boolean;
}

interface UseReviewRecordsResult {
  records: ReviewRecord[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  createReviewRecord: (
    input: CreateReviewRecordInput,
  ) => Promise<ReviewRecord | null>;
}

export function useReviewRecords(
  options: UseReviewRecordsOptions,
): UseReviewRecordsResult {
  const { accessToken, solutionVersionId, useMock } = options;

  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseApi =
    !useMock && !!accessToken && typeof solutionVersionId === "number";

  const loadFromApi = async () => {
    if (!canUseApi) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        buildApiUrl(`/solutions/${solutionVersionId}/reviews`),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        const message =
          (body && (body.message as string)) ||
          "加载评审记录列表失败，请稍后重试";
        setError(message);
        return;
      }
      const data = (await response.json()) as ReviewRecord[];
      setRecords(data || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load review records:", err);
      setError("无法连接到服务器，请检查后端服务是否已启动");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canUseApi) {
      loadFromApi();
    } else {
      setRecords([]);
      setLoading(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseApi, solutionVersionId]);

  const reload = () => {
    if (canUseApi) {
      void loadFromApi();
    }
  };

  const createReviewRecord = async (
    input: CreateReviewRecordInput,
  ): Promise<ReviewRecord | null> => {
    if (!canUseApi) {
      return null;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/solutions/${solutionVersionId}/reviews`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        const message =
          (body && (body.message as string)) ||
          "创建评审记录失败，请稍后重试";
        setError(message);
        return null;
      }

      const created = (await response.json()) as ReviewRecord;
      setRecords((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to create review record:", err);
      setError("无法连接到服务器，请检查后端服务是否已启动");
      return null;
    }
  };

  return {
    records,
    loading,
    error,
    reload,
    createReviewRecord,
  };
}
