import path from "node:path";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import vike from "vike/plugin";

type LocalRequest = IncomingMessage & {
  query?: Record<string, string | string[]>;
  body?: unknown;
};

function readLocalRequestBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === "GET" || req.method === "DELETE") return Promise.resolve(undefined);

  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on("error", reject);
  });
}

function getLocalQuery(req: IncomingMessage): Record<string, string | string[]> {
  const url = new URL(req.url || "/", "http://localhost");
  const query: Record<string, string | string[]> = {};

  for (const [key, value] of url.searchParams.entries()) {
    const previous = query[key];
    query[key] = previous === undefined
      ? value
      : Array.isArray(previous)
        ? [...previous, value]
        : [previous, value];
  }

  return query;
}

function createLocalResponse(res: ServerResponse) {
  const response = Object.assign(res, {
    status(statusCode: number) {
      res.statusCode = statusCode;
      return response;
    },
    json(body: unknown) {
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(body));
      return response;
    },
  });

  return response;
}

function localAdminUsersPlugin(): Plugin {
  return {
    name: "local-admin-users-api",
    configureServer(server) {
      let handlerPromise: Promise<(request: unknown, response: unknown) => Promise<unknown>> | null = null;

      server.middlewares.use("/api/admin-users", async (req, res, next) => {
        if (!["GET", "PATCH", "DELETE"].includes(req.method || "")) {
          next();
          return;
        }

        try {
          const body = await readLocalRequestBody(req);
          const request = Object.assign(req, {
            query: getLocalQuery(req),
            body,
          }) as LocalRequest;
          const response = createLocalResponse(res);

          handlerPromise ??= server
            .ssrLoadModule("/api/admin-users.ts")
            .then((module) => module.default as (request: unknown, response: unknown) => Promise<unknown>);
          const adminUsersHandler = await handlerPromise;
          await adminUsersHandler(request, response);
        } catch (error) {
          console.error("[local-admin-users]", error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: false, error: "Erro interno na API administrativa local." }));
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [react(), vike(), localAdminUsersPlugin()],
    build: {
      // react-snap usa Chromium antigo; manter target mais compatível evita
      // "Unexpected token '?'" durante o prerender.
      target: "es2019",
      sourcemap: true,
      rollupOptions: {
        output: {
          // Reduz o tamanho do .map e evita respostas truncadas em alguns proxies/CDNs.
          sourcemapExcludeSources: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: [".e2b.app"],
      host: "0.0.0.0",
    },
    preview: {
      host: "0.0.0.0",
    },
  };
});