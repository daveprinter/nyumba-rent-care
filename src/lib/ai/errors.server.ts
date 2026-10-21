export function gatewayFailure(error: unknown): { status: number; message: string } {
  const e = error as { statusCode?: number; responseBody?: string; message?: string; cause?: unknown };
  if (e?.cause && !e.statusCode) return gatewayFailure(e.cause);
  let message: string | undefined;
  if (e?.responseBody) {
    try {
      const body = JSON.parse(e.responseBody);
      message = body.message ?? body.error?.message;
    } catch { /* Never expose raw provider payloads. */ }
  }
  return {
    status: e?.statusCode ?? 500,
    message: message ?? (e?.statusCode === 401 ? "AI configuration is unavailable. Please contact the app owner." :
      e?.statusCode === 429 ? "AI is busy. Please wait before starting a new request." :
      "AI could not produce a valid assessment. Your request has not been lost; you can save it without AI."),
  };
}