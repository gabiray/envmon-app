import { useEffect, useState } from "react";
import api from "../services/api";

export function useMissionControlLive() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get("/mission-control/active");

        if (cancelled) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
        setError("");
      } catch (err) {
        if (cancelled) return;

        setError(
          err?.response?.data?.error ||
            err?.message ||
            "Failed to load mission control data."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    const timer = window.setInterval(load, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return { items, loading, error };
}
