import { renderPage } from "vike/server";

export default async function handler(req, res) {
  const { url } = req;
  if (url === undefined) throw new Error("req.url is undefined");

  const pageContext = await renderPage({
    urlOriginal: url,
    headersOriginal: req.headers,
  });

  const { httpResponse } = pageContext;
  if (!httpResponse) {
    res.statusCode = 404;
    res.end();
    return;
  }

  const { body, statusCode, headers } = httpResponse;
  res.statusCode = statusCode;
  headers.forEach(([name, value]) => res.setHeader(name, value));
  res.end(body);
}
