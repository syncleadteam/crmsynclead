import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "internal_error";

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function validationError(error: ZodError) {
  return apiError("validation_error", "Payload invalido.", 422, {
    fields: error.flatten().fieldErrors,
  });
}

export function apiData<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}
