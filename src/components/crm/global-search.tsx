"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { crmFetch } from "@/components/crm/client-api";

type SearchResult = {
  id: string;
  type: string;
  label: string;
  description: string;
  href: string;
};

const typeLabels: Record<string, string> = {
  companies: "Conta",
  contacts: "Contato",
  leads: "Lead",
  deals: "Oportunidade",
  products: "Produto",
  proposals: "Proposta",
};

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const query = term.trim();

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsLoading(true);
      crmFetch<{ data: SearchResult[] }>(
        `/api/v1/search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      )
        .then((payload) => {
          setResults(payload.data);
          setIsOpen(true);
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            console.error(error);
            setResults([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [term]);

  return (
    <div ref={rootRef} className={compact ? "relative min-w-56 shrink-0" : "relative"}>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(event) => {
            const nextTerm = event.target.value;
            setTerm(nextTerm);
            if (nextTerm.trim().length < 2) {
              setResults([]);
              setIsLoading(false);
            }
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar no CRM"
          className="h-9 w-full rounded-lg border border-input bg-background/60 pl-9 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {isOpen && term.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border bg-popover shadow-2xl shadow-primary/20">
          {isLoading ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto p-1">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  onClick={() => {
                    setIsOpen(false);
                    setTerm("");
                    setResults([]);
                  }}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{result.label}</span>
                    <span className="shrink-0 text-xs text-accent-cyan">
                      {typeLabels[result.type] ?? result.type}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {result.description}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
