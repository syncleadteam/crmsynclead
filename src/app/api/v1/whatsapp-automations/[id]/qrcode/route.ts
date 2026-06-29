import { AutomationService } from "@/lib/api/automations";
import { apiData, apiError } from "@/lib/api/errors";
import { EvolutionService, evolutionConfigError } from "@/lib/api/evolution";
import { requirePermission } from "@/lib/api/permissions";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requirePermission(request, "automations", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const connection = await AutomationService.getConnection(
      auth.context.supabase,
      auth.context.profile.id,
      id,
    );

    if (!connection) {
      return apiError("not_found", "Conexao nao encontrada.", 404);
    }

    const qrcode = await EvolutionService.getQrCode(connection.instance_name);

    return apiData({ connection, qrcode });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Evolution")) {
      return evolutionConfigError(error);
    }

    return apiError(
      "bad_request",
      "Nao foi possivel obter QR Code.",
      400,
      error instanceof Error ? error.message : error,
    );
  }
}
