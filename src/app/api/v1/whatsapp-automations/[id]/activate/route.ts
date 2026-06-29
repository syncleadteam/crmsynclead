import { AutomationService } from "@/lib/api/automations";
import { apiData, apiError } from "@/lib/api/errors";
import { evolutionConfigError } from "@/lib/api/evolution";
import { requirePermission } from "@/lib/api/permissions";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requirePermission(request, "automations", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const data = await AutomationService.activateAutomation(
      auth.context.supabase,
      auth.context.profile.id,
      id,
    );

    return apiData(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Evolution")) {
      return evolutionConfigError(error);
    }

    return apiError(
      "bad_request",
      "Nao foi possivel ativar a automacao.",
      400,
      error instanceof Error ? error.message : error,
    );
  }
}
