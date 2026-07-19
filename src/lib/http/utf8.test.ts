import { afterEach, describe, expect, it, vi } from "vitest";
import { utf8Fetch } from "./utf8";

describe("utf8Fetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares an in-flight request for identical mutations", async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetchSpy = vi.fn(
      () => new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const first = utf8Fetch("https://example.test/rest/v1/businesses", {
      method: "POST",
      body: JSON.stringify({ name: "Business" }),
    });
    const second = utf8Fetch("https://example.test/rest/v1/businesses", {
      method: "POST",
      body: JSON.stringify({ name: "Business" }),
    });

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    resolveRequest?.(new Response(JSON.stringify({ id: "business-1" }), { status: 201 }));

    await expect((await first).json()).resolves.toEqual({ id: "business-1" });
    await expect((await second).json()).resolves.toEqual({ id: "business-1" });
  });
});
