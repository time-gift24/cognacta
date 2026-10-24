"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { knowledgeSeeds } from "./config";
import { isKnowledgeEntry, type KnowledgeEntry } from "./knowledge-data";

const KEY = "cognacta.knowledge.v1";

const KnowledgeContext = createContext<{
  entries: KnowledgeEntry[];
  ready: boolean;
  loadError: string;
  save: (entries: KnowledgeEntry[]) => void;
} | null>(null);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const tDemo = useTranslations("Demo");
  const t = useTranslations("Knowledge");
  const initialEntries = useMemo<KnowledgeEntry[]>(
    () =>
      knowledgeSeeds.map((seed) => ({
        id: seed.id,
        title: tDemo(`knowledge.${seed.key}.title`),
        content: tDemo(`knowledge.${seed.key}.content`),
        url: seed.url,
      })),
    [tDemo],
  );
  const [entries, setEntries] = useState<KnowledgeEntry[]>(initialEntries);
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
      setLoadError(t("loadError"));
    }
    setReady(true);
    // Seeds are read once; locale changes reload the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
