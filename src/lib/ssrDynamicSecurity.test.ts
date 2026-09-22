import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/ssr-dynamic";

const previousSupabaseUrl = process.env.SUPABASE_URL;
const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

class MockResponse {
  statusCode = 200;
  body: unknown = null;
  headers = new Map<string, string>();

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }

  send(body: unknown) {
    this.body = body;
    return this;
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });
}

function eventRequest() {
  return {
    query: { kind: "event", eventId: "event-1" },
    headers: { host: "localhost:3000" },
  } as Parameters<typeof handler>[0];
}

function businessRequest() {
  return {
    query: { kind: "business", countryCode: "ca", businessName: "hidden-business" },
    headers: { host: "localhost:3000" },
  } as Parameters<typeof handler>[0];
}

describe("dynamic SSR publication checks", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.SUPABASE_URL = previousSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
  });

  it("returns 404 for a draft even if the privileged API returns it", async () => {
    const requestedUrls: URL[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      requestedUrls.push(url);
      return jsonResponse([
        {
          id: "event-1",
          title: "Draft privado",
          business_id: null,
          status: "draft",
        },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const response = new MockResponse();
    await handler(eventRequest(), response as unknown as Parameters<typeof handler>[1]);

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0].searchParams.get("status")).toBe("eq.published");
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Not found");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("hides a published event when its linked business is not approved", async () => {
    const requestedUrls: URL[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      requestedUrls.push(url);
      if (url.pathname.endsWith("/events")) {
        return jsonResponse([
          {
            id: "event-1",
            title: "Evento vinculado",
            business_id: "business-1",
            status: "published",
          },
        ]);
      }
      return jsonResponse([{ id: "business-1", moderation_status: "pending" }]);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const response = new MockResponse();
    await handler(eventRequest(), response as unknown as Parameters<typeof handler>[1]);

    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls[0].searchParams.get("status")).toBe("eq.published");
    expect(requestedUrls[1].searchParams.get("or")).toContain("moderation_status.eq.approved");
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Not found");
  });

  it("returns 404 for an unapproved business even if the privileged API returns it", async () => {
    let requestedUrl: URL | null = null;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = new URL(String(input));
      return jsonResponse([{ id: "business-1", name: "Negocio pendente", moderation_status: "pending" }]);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const response = new MockResponse();
    await handler(businessRequest(), response as unknown as Parameters<typeof handler>[1]);

    expect(requestedUrl?.searchParams.get("or")).toContain("moderation_status.eq.approved");
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Not found");
  });

  it("continues serving a published event without a linked business", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse([
        {
          id: "event-1",
          title: "Evento publicado",
          description: "Conteudo publico",
          business_id: null,
          status: "published",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const response = new MockResponse();
    await handler(eventRequest(), response as unknown as Parameters<typeof handler>[1]);

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Evento publicado");
  });
});
