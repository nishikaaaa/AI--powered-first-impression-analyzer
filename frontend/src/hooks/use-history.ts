"use client";

import { useEffect, useState } from "react";
import { listHistory, searchHistory, type HistoryItem } from "@/lib/history";

export function useHistory(query = "") {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(query ? searchHistory(query) : listHistory());
    setReady(true);
  }, [query]);

  return { items, ready };
}
