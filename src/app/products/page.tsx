import { EntityList } from "@/components/crm/entity-list";

export default function ProductsPage() {
  return (
    <EntityList
      kind="products"
      title="Catalogo comercial"
      description="Produtos e servicos usados em propostas de automacao."
      fields={[
        { name: "name", label: "Nome", required: true },
        { name: "sku", label: "SKU" },
        { name: "description", label: "Descricao" },
        { name: "unit_price", label: "Preco unitario", type: "number" },
      ]}
      columns={[
        { key: "name", label: "Nome" },
        { key: "sku", label: "SKU" },
        { key: "unit_price", label: "Preco" },
        { key: "is_active", label: "Ativo" },
      ]}
    />
  );
}
