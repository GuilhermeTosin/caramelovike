export const UTF8_JSON_CONTENT_TYPE = "application/json; charset=utf-8";

export const UTF8_JSON_HEADERS = {
  Accept: UTF8_JSON_CONTENT_TYPE,
  "Content-Type": UTF8_JSON_CONTENT_TYPE,
} as const;

type BufferedResponse = {
  body: ArrayBuffer;
  headers: [string, string][];
  status: number;
  statusText: string;
};

const inFlightMutationRequests = new Map<string, Promise<BufferedResponse>>();
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hasBinaryBody(body: BodyInit | null | undefined): boolean {
  return (
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer)
  );
}

export function withUtf8JsonHeaders(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers ?? {});
  const body = init.body;
  const isBinaryBody = hasBinaryBody(init.body);

  if (!headers.has("Accept")) {
    headers.set("Accept", UTF8_JSON_CONTENT_TYPE);
  }

  // Never force JSON content type for binary/multipart payloads (e.g. image upload).
  if (body && !isBinaryBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", UTF8_JSON_CONTENT_TYPE);
  }

  return {
    ...init,
    headers,
  };
}

export async function utf8Fetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const request = new Request(input, withUtf8JsonHeaders(init));

  if (!MUTATION_METHODS.has(request.method.toUpperCase())) {
    return fetch(request);
  }

  const contentType = request.headers.get("Content-Type") || "";
  const isTextualPayload =
    !contentType ||
    contentType.includes("application/json") ||
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.startsWith("text/");

  // Uploads have binary bodies and must remain independent requests.
  if (hasBinaryBody(init.body) || !isTextualPayload) {
    return fetch(request);
  }

  const body = await request.clone().text();
  const key = [
    request.method.toUpperCase(),
    request.url,
    request.headers.get("Authorization") || "",
    body,
  ].join("\n");
  const existing = inFlightMutationRequests.get(key);

  if (existing) {
    return existing.then(createResponseFromBuffer);
  }

  const pending = fetch(request)
    .then(async (response) => ({
      body: await response.arrayBuffer(),
      headers: Array.from(response.headers.entries()),
      status: response.status,
      statusText: response.statusText,
    }))
    .finally(() => {
      inFlightMutationRequests.delete(key);
    });

  inFlightMutationRequests.set(key, pending);
  return pending.then(createResponseFromBuffer);
}

function createResponseFromBuffer(response: BufferedResponse): Response {
  const responseBody = response.status === 204 || response.status === 205 ? null : response.body.slice(0);

  return new Response(responseBody, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function jsonUtf8Response(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", UTF8_JSON_CONTENT_TYPE);

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}
