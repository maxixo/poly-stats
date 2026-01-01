import { useCallback, useEffect, useState } from "react";

type RequestFn<T, Args extends unknown[]> = (...args: Args) => Promise<T>;

type UseRequestOptions = {
  immediate?: boolean;
  deps?: unknown[];
};

export const useRequest = <T, Args extends unknown[]>(
  requestFn: RequestFn<T, Args>,
  { immediate = false, deps = [] }: UseRequestOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const run = useCallback(
    async (...args: Args) => {
      try {
        setLoading(true);
        setError("");
        const result = await requestFn(...args);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [requestFn, ...deps]
  );

  useEffect(() => {
    if (immediate) {
      run();
    }
  }, [immediate, run]);

  return { data, error, loading, run };
};