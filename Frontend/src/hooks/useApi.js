import { useState, useEffect, useCallback } from "react";

export function useApi(apiFn, immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFn(...args);
        setData(res.data);
        return res.data;
      } catch (err) {
        const msg = err.response?.data?.error || "Something went wrong";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  useEffect(() => {
    if (immediate) execute();
  }, []);

  return { data, loading, error, execute, setData };
}