import { apiError } from "@/lib/api/errors";
import { rateLimit, requestIp } from "@/lib/api/rate-limit";

export function requireN8nCallback(request: Request) {
  const limited = rateLimit(`n8n:${requestIp(request)}`, {
    limit: 120,
    windowMs: 60_000,
  });

  if (limited) {
    return limited;
  }

  const expectedToken = process.env.N8N_CALLBACK_TOKEN;

  if (!expectedToken) {
    return apiError("internal_error", "N8N callback token nao configurado.", 500);
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  if (token !== expectedToken) {
    return apiError("unauthorized", "Callback N8N nao autorizado.", 401);
  }

  return null;
}
