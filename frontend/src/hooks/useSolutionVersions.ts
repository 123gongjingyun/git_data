import { useEffect, useState } from "react";
import { buildApiUrl } from "../shared/api";

export type SolutionStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "archived";

export interface SolutionVersion {
  id: number;
  name: string;
  versionTag?: string;
  status: SolutionStatus;
  summary?: string;
  createdAt: string;
}

export interface CreateSolutionVersionInput {
  name: string;
  versionTag?: string;
  status: SolutionStatus;
  summary?: string;
}

interface UseSolutionVersionsOptions {
  accessToken: string | null;
  opportunityId: number | null;
  useMock: boolean;
}

interface UseSolutionVersionsResult {
  solutions: SolutionVersion[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  createSolutionVersion: (
    input: CreateSolutionVersionInput,
  ) => Promise<SolutionVersion | null>;
}

export function useSolutionVersions(
  options: UseSolutionVersionsOptions,
): UseSolutionVersionsResult {
  const { accessToken, opportunityId, useMock } = options;

  const [solutions, setSolutions] = useState<SolutionVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseApi =
    !useMock && !!accessToken && typeof opportunityId === "number";

  const loadFromApi = async () => {
    if (!canUseApi) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        buildApiUrl(`/opportunities/${opportunityId}/solutions`),
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
          "加载方案版本列表失败，请稍后重试";
        setError(message);
        return;
      }
      const data = (await response.json()) as SolutionVersion[];
      setSolutions(data || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load solution versions:", err);
      setError("无法连接到服务器，请检查后端服务是否已启动");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canUseApi) {
      loadFromApi();
    } else {
      // 在 Mock 模式或条件不足时由外部负责提供方案版本数据，这里保持为空
      setSolutions([]);
      setLoading(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseApi, opportunityId]);

  const reload = () => {
    if (canUseApi) {
      void loadFromApi();
    }
  };

  const createSolutionVersion = async (
    input: CreateSolutionVersionInput,
  ): Promise<SolutionVersion | null> => {
    if (!canUseApi) {
      // 在 Mock 模式下，创建逻辑由上层组件自行处理
      return null;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/opportunities/${opportunityId}/solutions`),
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
          (body && (body.message as string)) || "创建方案版本失败，请稍后重试";
        setError(message);
        return null;
      }

      const created = (await response.json()) as SolutionVersion;
      setSolutions((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to create solution version:", err);
      setError("无法连接到服务器，请检查后端服务是否已启动");
      return null;
    }
  };

  return {
    solutions,
    loading,
    error,
    reload,
    createSolutionVersion,
  };
}
