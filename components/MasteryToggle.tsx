"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { masteryChangeEvent, masteryStorageKey } from "@/lib/mastery";

type Props = {
  trickId: string;
  trickName: string;
};

export function MasteryToggle({ trickId, trickName }: Props) {
  const [checked, setChecked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function sync() {
      setChecked(readMasteredIds().has(trickId));
      setLoaded(true);
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(masteryChangeEvent, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(masteryChangeEvent, sync);
    };
  }, [trickId]);

  function toggle() {
    const next = !checked;
    const ids = readMasteredIds();
    if (next) ids.add(trickId);
    else ids.delete(trickId);
    window.localStorage.setItem(masteryStorageKey, JSON.stringify(Array.from(ids)));
    setChecked(next);
    window.dispatchEvent(new CustomEvent(masteryChangeEvent, { detail: { trickId, checked: next } }));
  }

  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={`${trickName}を${checked ? "未習得" : "習得済み"}にする`}
      onClick={toggle}
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded px-4 text-sm font-black transition sm:w-auto ${
        checked ? "bg-saffron text-ink shadow-sm hover:bg-saffron/80" : "border border-ink/12 bg-white text-graphite hover:border-pine hover:text-pine"
      }`}
    >
      {checked ? <CheckCircle2 aria-hidden className="size-4" /> : <Circle aria-hidden className="size-4" />}
      {checked ? "習得済み" : "習得チェック"}
      {checked && loaded ? <Sparkles aria-hidden className="size-4" /> : null}
    </button>
  );
}

function readMasteredIds() {
  try {
    const raw = window.localStorage.getItem(masteryStorageKey);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}
