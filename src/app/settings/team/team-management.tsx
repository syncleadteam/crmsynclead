"use client";

import { RefreshCw, Shield, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { roleLabels, type UserRole } from "@/lib/auth/roles";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type CrmUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type TeamMember = {
  id: string;
  user_id: string;
  user: CrmUser | null;
};

type Team = {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  manager: CrmUser | null;
  team_members: TeamMember[];
};

async function getAccessToken() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export function TeamManagement() {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeUsers = useMemo(
    () => users.filter((user) => user.is_active).length,
    [users],
  );

  async function loadData(options: { showLoading?: boolean } = {}) {
    if (options.showLoading) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        window.location.href = "/login";
        return;
      }

      const headers = { Authorization: `Bearer ${accessToken}` };
      const [usersResponse, teamsResponse] = await Promise.all([
        fetch("/api/v1/users", { headers }),
        fetch("/api/v1/teams", { headers }),
      ]);

      if (usersResponse.status === 403 || teamsResponse.status === 403) {
        window.location.href = "/unauthorized";
        return;
      }

      if (!usersResponse.ok || !teamsResponse.ok) {
        setError("Nao foi possivel carregar usuarios e equipes.");
        return;
      }

      const usersPayload = (await usersResponse.json()) as { data: CrmUser[] };
      const teamsPayload = (await teamsResponse.json()) as { data: Team[] };

      setUsers(usersPayload.data);
      setTeams(teamsPayload.data);
    } catch {
      setError("Falha ao consultar a central SyncLead.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Equipe</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Equipes e usuarios
            </h1>
          </div>
          <Button
            onClick={() => void loadData({ showLoading: true })}
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw />
            Atualizar
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              Usuarios ativos
            </div>
            <p className="mt-2 text-2xl font-semibold">{activeUsers}</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="size-4" />
              Admins
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {users.filter((user) => user.role === "admin").length}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              Equipes
            </div>
            <p className="mt-2 text-2xl font-semibold">{teams.length}</p>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Usuarios</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Papel</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                        Carregando usuarios...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                        Nenhum usuario visivel para seu papel.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">
                          {user.full_name ?? "Sem nome"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">{roleLabels[user.role]}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md border px-2 py-1 text-xs">
                            {user.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border bg-background">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Equipes</h2>
            </div>
            <div className="divide-y">
              {isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Carregando equipes...
                </p>
              ) : teams.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Nenhuma equipe configurada.
                </p>
              ) : (
                teams.map((team) => (
                  <article key={team.id} className="p-4">
                    <h3 className="font-medium">{team.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Gestor: {team.manager?.full_name ?? team.manager?.email ?? "Nao definido"}
                    </p>
                    <p className="mt-2 text-sm">
                      {team.team_members.length} membro(s)
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
