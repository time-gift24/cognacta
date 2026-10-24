"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  INITIAL_KNOWLEDGE,
  isKnowledgeEntry,
  type KnowledgeEntry,
} from "./knowledge-data";

const KEY = "pair.knowledge.v1";
const KnowledgeContext = createContext<{
  entries: KnowledgeEntry[];
  ready: boolean;
  loadError: string;
  save: (entries: KnowledgeEntry[]) => void;
} | null>(null);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState(INITIAL_KNOWLEDGE);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed) || !parsed.every(isKnowledgeEntry))
          throw new Error("Invalid knowledge data");
        setEntries(parsed);
      }
    } catch {
      setLoadError(
        "Saved knowledge could not be loaded. Sample sources are shown.",
      );
    }
    setReady(true);
  }, []);
  function save(next: KnowledgeEntry[]) {
    // Only update the UI after storage succeeds, so a failed save keeps the draft.
    localStorage.setItem(KEY, JSON.stringify(next));
    setEntries(next);
  }
  return (
    <KnowledgeContext.Provider value={{ entries, ready, loadError, save }}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (!context) throw new Error("useKnowledge requires KnowledgeProvider");
  return context;
}
