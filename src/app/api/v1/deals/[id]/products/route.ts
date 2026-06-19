import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { createDealProductSchema } from "@/lib/api/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("deal_products")
    .select("id,deal_id,product_id,quantity,unit_price,discount_amount,total_amount,created_at,updated_at,product:products(id,name,sku)")
    .eq("deal_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar itens do deal.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = createDealProductSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data: product, error: productError } = await auth.context.supabase
    .from("products")
    .select("id,unit_price")
    .eq("id", parsed.data.product_id)
    .single();

  if (productError || !product) {
    return apiError("not_found", "Produto nao encontrado.", 404);
  }

  const { data, error } = await auth.context.supabase
    .from("deal_products")
    .insert({
      deal_id: id,
      product_id: parsed.data.product_id,
      quantity: parsed.data.quantity,
      unit_price: parsed.data.unit_price ?? product.unit_price,
      discount_amount: parsed.data.discount_amount,
    })
    .select("id,deal_id,product_id,quantity,unit_price,discount_amount,total_amount,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel adicionar produto ao deal.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("item_id");

  if (!itemId) {
    return apiError("validation_error", "item_id obrigatorio.", 422);
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("deal_products")
    .delete()
    .eq("id", itemId)
    .eq("deal_id", id)
    .select("id")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel remover item.", 400, error.message);
  }

  return apiData(data);
}
