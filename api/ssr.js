import { renderPage } from "vike/server";

function render404Html() {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <title>Página não encontrada | Caramelinho.com</title>
    <meta name="description" content="A página solicitada não foi encontrada. Use a busca ou volte para a inicial do Caramelinho." />
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111827;
        background: linear-gradient(180deg, #fffdf7 0%, #f7f7f2 100%);
        min-height: 100vh;
      }
      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        width: min(100%, 980px);
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 32px;
        align-items: center;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(251, 191, 36, 0.12);
        border: 1px solid rgba(251, 191, 36, 0.25);
        color: #92400e;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      h1 { margin: 0; font-size: clamp(32px, 5vw, 48px); line-height: 1.15; letter-spacing: -0.03em; }
      h1 span { display: block; color: #d97706; }
      p { color: #6b7280; font-size: 18px; line-height: 1.65; margin: 20px 0 0; max-width: 58ch; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 20px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        transition: opacity 0.2s ease, background 0.2s ease;
      }
      .btn.primary { background: #f59e0b; color: white; }
      .btn.outline { background: white; border: 1px solid #d1d5db; color: #111827; }
      .btn:hover { opacity: 0.92; }
      .art { display: flex; justify-content: center; }
      .art img { width: min(100%, 340px); height: auto; filter: drop-shadow(0 16px 28px rgba(0,0,0,.1)); }
      @media (max-width: 640px) {
        .wrap { padding: 16px; }
        p { font-size: 16px; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <main class="card">
        <section>
          <div class="badge">Erro 404</div>
          <h1>
            O Caramelinho farejou...
            <span>mas não encontrou essa página</span>
          </h1>
          <p>
            Essa página não está disponível no momento. Mas você pode continuar explorando os melhores negócios
            brasileiros por aqui.
          </p>
          <div class="actions">
            <a class="btn primary" href="/">Voltar para a inicial</a>
            <a class="btn outline" href="/buscar">Ir para buscar</a>
          </div>
        </section>
        <section class="art">
          <img src="/logo.webp" alt="Caramelinho com lupa procurando páginas" width="420" height="382" />
        </section>
      </main>
    </div>
  </body>
</html>`;
}

function render500Html() {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <title>Erro ao carregar a página | Caramelinho.com</title>
    <meta name="description" content="Não foi possível carregar esta página no momento. Tente novamente em instantes." />
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111827;
        background: linear-gradient(180deg, #fffdf7 0%, #f7f7f2 100%);
        min-height: 100vh;
      }
      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        width: min(100%, 900px);
        padding: 32px;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(209, 213, 219, 0.8);
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.22);
        color: #991b1b;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      h1 { margin: 0; font-size: clamp(30px, 5vw, 44px); line-height: 1.15; letter-spacing: -0.03em; }
      p { color: #6b7280; font-size: 18px; line-height: 1.65; margin: 20px 0 0; max-width: 58ch; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 20px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        transition: opacity 0.2s ease, background 0.2s ease;
      }
      .btn.primary { background: #f59e0b; color: white; }
      .btn.outline { background: white; border: 1px solid #d1d5db; color: #111827; }
      .btn:hover { opacity: 0.92; }
      @media (max-width: 640px) {
        .wrap { padding: 16px; }
        .card { padding: 24px; }
        p { font-size: 16px; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <main class="card">
        <div class="badge">Erro 500</div>
        <h1>Não foi possível carregar esta página agora</h1>
        <p>
          Tivemos um problema ao processar esta rota. Você pode tentar novamente em instantes ou voltar para a
          página inicial.
        </p>
        <div class="actions">
          <a class="btn primary" href="/">Voltar para a inicial</a>
          <a class="btn outline" href="/buscar">Ir para buscar</a>
        </div>
      </main>
    </div>
  </body>
</html>`;
}

function parseBusinessPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 4) {
    const [countryCode, stateCode, city, businessName] = parts;
    return { kind: "full", countryCode, stateCode, city, businessName };
  }
  if (parts.length === 2) {
    const [countryCode, businessName] = parts;
    return { kind: "country", countryCode, businessName };
  }
  return null;
}

function isKnownAppPath(pathname) {
  const exactPaths = new Set([
    "/",
    "/buscar",
    "/negocios",
    "/cadastro",
    "/entrar",
    "/redefinir-senha",
    "/perfil",
    "/negocio-verificado",
    "/sobre",
    "/contato",
    "/privacidade",
    "/termos",
    "/negocio/wizard",
  ]);

  if (exactPaths.has(pathname)) return true;
  if (pathname.startsWith("/negocios/")) return true;
  if (pathname.startsWith("/eventos/")) return true;
  if (pathname.startsWith("/preview/negocio/")) return true;
  if (pathname.startsWith("/go/")) return true;
  return !!parseBusinessPath(pathname);
}

function normalizePathname(pathname) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function applyNegociosCacheHeaders(res, pathname, statusCode) {
  if (statusCode !== 200) return;

  const normalizedPathname = normalizePathname(pathname);
  if (normalizedPathname !== "/negocios") return;

  const cacheHeader = "s-maxage=900, stale-while-revalidate=86400";

  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.setHeader("CDN-Cache-Control", cacheHeader);
  res.setHeader("Vercel-CDN-Cache-Control", cacheHeader);
}

export default async function handler(req, res) {
  const { url } = req;
  if (url === undefined) throw new Error("req.url is undefined");

  let pageContext;
  try {
    pageContext = await renderPage({
      urlOriginal: url,
      headersOriginal: req.headers,
    });
  } catch (error) {
    console.error("[api/ssr] renderPage failed:", error);
    const pathname = (() => {
      try {
        return new URL(url, "http://localhost").pathname;
      } catch {
        return "/";
      }
    })();
    res.statusCode = isKnownAppPath(pathname) ? 500 : 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(isKnownAppPath(pathname) ? render500Html() : render404Html());
    return;
  }

  const { httpResponse } = pageContext;
  if (!httpResponse) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(render404Html());
    return;
  }

  const { body, statusCode, headers } = httpResponse;
  res.statusCode = statusCode;
  headers.forEach(([name, value]) => res.setHeader(name, value));
  applyNegociosCacheHeaders(res, new URL(url, "http://localhost").pathname, statusCode);
  if (statusCode === 404) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(render404Html());
    return;
  }

  res.end(body);
}
