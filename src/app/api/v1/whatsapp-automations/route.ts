import { AutomationService } from "@/lib/api/automations";
import { apiData, apiError } from "@/lib/api/errors";
import { requirePermission } from "@/lib/api/permissions";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "automations", "view");

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const data = await AutomationService.listCards(
      auth.context.supabase,
      auth.context.profile.id,
    );

    return apiData(data);
  } catch (error) {
    return apiError(
      "bad_request",
      "Nao foi possivel listar automacoes WhatsApp.",
      400,
      error instanceof Error ? error.message : error,
    );
  }
}
