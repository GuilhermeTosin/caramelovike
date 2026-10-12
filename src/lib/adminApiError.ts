export function getAdminApiErrorMessage(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value instanceof Error) return value.message.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    const messages = value
      .map(getAdminApiErrorMessage)
      .filter((message): message is string => Boolean(message));
    return messages.length > 0 ? messages.join("; ") : null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code.trim() : "";

    for (const key of ["message", "error", "details", "hint"]) {
      const message = getAdminApiErrorMessage(record[key]);
      if (message) return code && !message.includes(`(${code})`) ? `${message} (${code})` : message;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "A API retornou um erro estruturado sem mensagem legível.";
    }
  }

  return null;
}
