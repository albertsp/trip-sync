import { useEffect, useState } from "react";
import type { AuthUser } from "../types";
import { API_BASE_URL } from "./api";

/** Session user from /api/me (null when signed out). `loading` until the first answer. */
export function useCurrentUser(): { user: AuthUser | null; loading: boolean } {
  const [state, setState] = useState<{ user: AuthUser | null; loading: boolean }>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/me`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((user: AuthUser | null) => {
        if (!cancelled) setState({ user, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
