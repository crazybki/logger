import { useEffect, useState } from "react";

export function useLoggingProgress(dateKey, connectionKey, syncRevision) {
  const [state, setState] = useState({ snapshot: null, loading: true, error: "" });
  const [refreshRevision, setRefreshRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      setState(previous => ({ ...previous, loading: true, error: "" }));
      try {
        if (!window.loggerAPI?.getLoggingProgress) throw new Error("Desktop app required");
        const result = await window.loggerAPI.getLoggingProgress();
        if (!result?.ok) throw new Error(result?.error || "Refresh failed");
        if (!cancelled) setState({ snapshot: { ...result, connectionKey }, loading: false, error: "" });
      } catch (error) {
        if (!cancelled) setState(previous => ({ ...previous, loading: false, error: error.message }));
      }
    }
    void refresh();
    return () => { cancelled = true; };
  }, [dateKey, connectionKey, syncRevision, refreshRevision]);
  return {
    ...state,
    snapshot: state.snapshot?.dateKey === dateKey && state.snapshot?.connectionKey === connectionKey ? state.snapshot : null,
    refresh: () => setRefreshRevision(value => value + 1),
  };
}
