import { EntityList } from "@/components/crm/entity-list";

export default function ProductsPage() {
  return (
    <EntityList
      kind="products"
      title="Catálogo comercial"
      description="Produtos e serviços usados em propostas de automação."
      fields={[
        { name: "name", label: "Nome", required: true },
        { name: "sku", label: "SKU" },
        { name: "description", label: "Descrição" },
        { name: "unit_price", label: "Preço unitário", type: "number" },
      ]}
      columns={[
        { key: "name", label: "Nome" },
        { key: "sku", label: "SKU" },
        { key: "unit_price", label: "Preço" },
        { key: "is_active", label: "Ativo" },
      ]}
    />
  );
}
