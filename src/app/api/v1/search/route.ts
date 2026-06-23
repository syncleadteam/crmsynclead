import { requirePermission } from "@/lib/api/permissions";
import { apiData, apiError } from "@/lib/api/errors";
import { hasPermission, type PermissionModule } from "@/lib/auth/permissions";

type SearchResult = {
  id: string;
  type: PermissionModule;
  label: string;
  description: string;
  href: string;
};

const typeLabels: Record<PermissionModule, string> = {
  dashboard: "Visao geral",
  companies: "Conta",
  contacts: "Contato",
  leads: "Lead",
  deals: "Oportunidade",
  tasks: "Agenda",
  products: "Produto",
  proposals: "Proposta",
  pipelines: "Funil",
  automations: "Automacao",
  team: "Equipe",
};

function sanitizeTerm(value: string | null) {
  return value?.trim().slice(0, 80) ?? "";
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "dashboard", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const term = sanitizeTerm(searchParams.get("q"));
  const pattern = `%${term}%`;
  const results: SearchResult[] = [];

  if (term.length < 2) {
    return apiData(results);
  }

  const canView = (module: PermissionModule) =>
    hasPermission(auth.context.profile.role, module, "view");

  const queries = await Promise.all([
    canView("companies")
      ? auth.context.supabase
          .from("companies")
          .select("id,name,segment")
          .is("deleted_at", null)
          .ilike("name", pattern)
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
    canView("contacts")
      ? auth.context.supabase
          .from("contacts")
          .select("id,full_name,email,phone")
          .is("deleted_at", null)
          .or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
    canView("leads")
      ? auth.context.supabase
          .from("leads")
          .select("id,status,score,contact:contacts(full_name,email,company:companies(name))")
          .is("deleted_at", null)
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    canView("deals")
      ? auth.context.supabase
          .from("deals")
          .select("id,title,value,status,company:companies(name),contact:contacts(full_name)")
          .is("deleted_at", null)
          .ilike("title", pattern)
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
    canView("products")
      ? auth.context.supabase
          .from("products")
          .select("id,name,sku,landing_form_category")
          .or(`name.ilike.${pattern},sku.ilike.${pattern}`)
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
    canView("proposals")
      ? auth.context.supabase
          .from("proposals")
          .select("id,title,status,total_value,deal:deals(title)")
          .ilike("title", pattern)
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const firstError = queries.find((query) => query.error)?.error;

  if (firstError) {
    return apiError("bad_request", "Nao foi possivel executar a busca.", 400, firstError.message);
  }

  const [companies, contacts, leads, deals, products, proposals] = queries;

  results.push(
    ...((companies.data ?? []) as Array<{ id: string; name: string; segment: string | null }>).map(
      (item) => ({
        id: item.id,
        type: "companies" as const,
        label: item.name,
        description: item.segment ?? typeLabels.companies,
        href: `/companies/${item.id}`,
      }),
    ),
  );

  results.push(
    ...((contacts.data ?? []) as Array<{ id: string; full_name: string; email: string | null; phone: string | null }>).map(
      (item) => ({
        id: item.id,
        type: "contacts" as const,
        label: item.full_name,
        description: item.email ?? item.phone ?? typeLabels.contacts,
        href: `/contacts/${item.id}`,
      }),
    ),
  );

  results.push(
    ...((leads.data ?? []) as Array<{
      id: string;
      status: string;
      score: number;
      contact: { full_name: string | null; email: string | null; company: { name: string | null } | null } | null;
    }>)
      .filter((item) => {
        const haystack = `${item.contact?.full_name ?? ""} ${item.contact?.email ?? ""} ${item.contact?.company?.name ?? ""}`.toLowerCase();
        return haystack.includes(term.toLowerCase());
      })
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        type: "leads" as const,
        label: item.contact?.full_name ?? "Lead sem contato",
        description: `${item.status} · score ${item.score}`,
        href: `/leads/${item.id}`,
      })),
  );

  results.push(
    ...((deals.data ?? []) as Array<{ id: string; title: string; status: string; company: { name: string | null } | null; contact: { full_name: string | null } | null }>).map(
      (item) => ({
        id: item.id,
        type: "deals" as const,
        label: item.title,
        description: item.company?.name ?? item.contact?.full_name ?? item.status,
        href: `/deals/${item.id}`,
      }),
    ),
  );

  results.push(
    ...((products.data ?? []) as Array<{ id: string; name: string; sku: string | null; landing_form_category: string | null }>).map(
      (item) => ({
        id: item.id,
        type: "products" as const,
        label: item.name,
        description: item.sku ?? item.landing_form_category ?? typeLabels.products,
        href: "/settings/landing-products",
      }),
    ),
  );

  results.push(
    ...((proposals.data ?? []) as Array<{ id: string; title: string; status: string; deal: { title: string | null } | null }>).map(
      (item) => ({
        id: item.id,
        type: "proposals" as const,
        label: item.title,
        description: item.deal?.title ?? item.status,
        href: `/proposals/${item.id}`,
      }),
    ),
  );

  return apiData(results.slice(0, 12));
}

