"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type Deal = {
  id: string;
  title: string;
  value: number;
  status: string;
  company: { name: string } | null;
  contact: { full_name: string } | null;
};

type Product = {
  id: string;
  name: string;
  unit_price: number;
};

type DealProduct = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total_amount: number;
  product: { name: string; sku: string | null } | null;
};

type Proposal = {
  id: string;
  title: string;
  version: number;
  status: string;
  total_value: number;
};

export function DealDetail({ id }: { id: string }) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<DealProduct[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [proposalTitle, setProposalTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [dealPayload, productsPayload, itemsPayload, proposalsPayload] =
        await Promise.all([
          crmFetch<{ data: Deal }>(`/api/v1/deals/${id}`),
          crmFetch<{ data: Product[] }>("/api/v1/products"),
          crmFetch<{ data: DealProduct[] }>(`/api/v1/deals/${id}/products`),
          crmFetch<{ data: Proposal[] }>(`/api/v1/proposals?deal_id=${id}`),
        ]);

      setDeal(dealPayload.data);
      setProducts(productsPayload.data);
      setItems(itemsPayload.data);
      setProposals(proposalsPayload.data);
      setProductId((current) => current || productsPayload.data[0]?.id || "");
      setProposalTitle((current) => current || `Proposta - ${dealPayload.data.title}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar a oportunidade.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await crmFetch(`/api/v1/deals/${id}/products`, {
        method: "POST",
        body: JSON.stringify({
          product_id: productId,
          quantity: Number(quantity),
        }),
      });
      setQuantity("1");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel adicionar produto.",
      );
    }
  }

  async function createProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const payload = await crmFetch<{ data: { id: string } }>("/api/v1/proposals", {
        method: "POST",
        body: JSON.stringify({
          deal_id: id,
          title: proposalTitle,
          total_value: deal?.value ?? 0,
          content: {
            deal_id: id,
            items: items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              total_amount: item.total_amount,
            })),
          },
        }),
      });
      window.location.href = `/proposals/${payload.data.id}`;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel criar proposta.",
      );
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <AppShell>
      <div className="grid w-full gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="rounded-xl border bg-card/70 shadow-2xl shadow-primary/10 backdrop-blur">
          <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button asChild size="sm" variant="link" className="h-auto px-0">
                <Link href="/deals">Voltar para oportunidades</Link>
              </Button>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {deal?.title ?? "Detalhe da oportunidade"}
              </h1>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => void load(true)}
            >
              <RefreshCw />
              Atualizar
            </Button>
          </header>
          {error ? (
            <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="grid gap-4 p-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : deal ? (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border p-3">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{deal.status}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-medium">R$ {deal.value.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-sm text-muted-foreground">Conta</p>
                    <p className="font-medium">{deal.company?.name ?? "-"}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-sm text-muted-foreground">Contato</p>
                    <p className="font-medium">{deal.contact?.full_name ?? "-"}</p>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="border-b px-4 py-3">
                    <h2 className="font-semibold">Produtos</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Produto</th>
                          <th className="px-4 py-3 font-medium">Qtd.</th>
                          <th className="px-4 py-3 font-medium">Unit.</th>
                          <th className="px-4 py-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                              Nenhum produto vinculado.
                            </td>
                          </tr>
                        ) : (
                          items.map((item) => (
                            <tr key={item.id} className="border-b last:border-0">
                              <td className="px-4 py-3">{item.product?.name ?? item.product_id}</td>
                              <td className="px-4 py-3">{item.quantity}</td>
                              <td className="px-4 py-3">R$ {item.unit_price.toLocaleString("pt-BR")}</td>
                              <td className="px-4 py-3">R$ {item.total_amount.toLocaleString("pt-BR")}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="border-b px-4 py-3">
                    <h2 className="font-semibold">Propostas</h2>
                  </div>
                  <div className="divide-y">
                    {proposals.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">
                        Nenhuma proposta criada.
                      </p>
                    ) : (
                      proposals.map((proposal) => (
                        <Link
                          key={proposal.id}
                          href={`/proposals/${proposal.id}`}
                          className="block p-4 text-sm hover:bg-muted/50"
                        >
                          <span className="font-medium">{proposal.title}</span>
                          <span className="ml-2 text-muted-foreground">
                            v{proposal.version} - {proposal.status}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Oportunidade nao encontrada.</p>
            )}
          </div>
        </section>

        <aside className="grid gap-4">
          <form onSubmit={addProduct} className="rounded-xl border bg-card/70 p-4">
            <h2 className="font-semibold">Adicionar produto da solucao</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Produto
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  required
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Quantidade
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </label>
              <Button type="submit" disabled={!productId}>
                <Plus />
                Adicionar
              </Button>
            </div>
          </form>

          <form onSubmit={createProposal} className="rounded-xl border bg-card/70 p-4">
            <h2 className="font-semibold">Nova proposta</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Titulo
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={proposalTitle}
                  onChange={(event) => setProposalTitle(event.target.value)}
                  required
                />
              </label>
              <Button type="submit">
                <Plus />
                Criar proposta
              </Button>
            </div>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
