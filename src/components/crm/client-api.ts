"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function crmFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    window.location.href = "/login";
    throw new Error("Missing session.");
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init.headers,
    },
  });

  if (response.status === 403) {
    window.location.href = "/unauthorized";
    throw new Error("Forbidden.");
  }

  const payload = (await response.json()) as T & {
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha ao consultar a central SyncLead.");
  }

  return payload;
}
