"use client";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";

export default function EventTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch("/event-types");
      if (!res.ok) throw new Error(`API ${res.status}`);
      const d = await res.json();
      setTypes(Array.isArray(d) ? d : []);
    } catch (e: any) { setError(e?.message || "Failed."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-extrabold">Event Types</h1>
      {loading ? <p>Loading...</p> : <p>Loaded {types.length} types</p>}
      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}
