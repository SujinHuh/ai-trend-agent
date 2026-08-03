import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import type { NormalizedSourceConfig } from "../sources/source-config.js";
import { renderNewsPage } from "./render-news-page.js";
import {
  buildNewsPageModel,
  NewsViewQueryError,
  parseNewsViewQuery,
  resolveNewsReportDate
} from "./news-view-model.js";

type NewsStore = Pick<LlmWikiStore, "listDigestReportDates" | "getNewsDigestSnapshot">;

export interface NewsHttpServerOptions {
  store: NewsStore;
  sources: NormalizedSourceConfig[];
  publicBasePath?: string;
}

export function createNewsHttpServer(options: NewsHttpServerOptions): Server {
  const publicBasePath = normalizeBasePath(options.publicBasePath ?? "/news");
  return createServer((request, response) => {
    handleNewsHttpRequest(request, response, { ...options, publicBasePath });
  });
}

function handleNewsHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: NewsHttpServerOptions & { publicBasePath: string }
): void {
  const method = request.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    response.setHeader("allow", "GET, HEAD");
    writeJson(response, method, 405, { ok: false, error: "Only GET and HEAD are supported" });
    return;
  }

  let url: URL;
  try {
    url = new URL(request.url ?? "/", "http://localhost");
  } catch {
    writeHtml(response, method, 400, renderErrorPage(400, "잘못된 요청 URL입니다.", options.publicBasePath));
    return;
  }

  if (url.pathname === "/healthz") {
    try {
      options.store.listDigestReportDates();
      writeJson(response, method, 200, { ok: true, service: "ai-trend-news" });
    } catch {
      writeJson(response, method, 503, { ok: false, service: "ai-trend-news" });
    }
    return;
  }

  if (url.pathname !== "/news") {
    writeHtml(response, method, 404, renderErrorPage(404, "페이지를 찾을 수 없습니다.", options.publicBasePath));
    return;
  }

  let query;
  try {
    query = parseNewsViewQuery(url.searchParams);
  } catch (error: unknown) {
    if (!(error instanceof NewsViewQueryError)) {
      writeHtml(response, method, 500, renderErrorPage(500, "뉴스 요청을 처리하지 못했습니다.", options.publicBasePath));
      return;
    }
    writeHtml(response, method, 400, renderErrorPage(400, error.message, options.publicBasePath));
    return;
  }

  try {
    const availableDates = options.store.listDigestReportDates();
    const selectedDate = resolveNewsReportDate(availableDates, query.date);
    const snapshot = selectedDate === null ? null : options.store.getNewsDigestSnapshot(selectedDate);
    const model = buildNewsPageModel({
      availableDates,
      selectedDate,
      snapshot,
      query,
      sources: options.sources
    });
    writeHtml(response, method, 200, renderNewsPage(model, { basePath: options.publicBasePath }));
  } catch {
    writeHtml(response, method, 500, renderErrorPage(500, "뉴스 데이터를 읽지 못했습니다.", options.publicBasePath));
  }
}

function writeHtml(response: ServerResponse, method: string, statusCode: number, html: string): void {
  response.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  });
  response.end(method === "HEAD" ? undefined : html);
}

function writeJson(response: ServerResponse, method: string, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(method === "HEAD" ? undefined : JSON.stringify(body));
}

function renderErrorPage(statusCode: number, message: string, basePath: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${statusCode} | AI Trend Agent</title><style>body{margin:0;display:grid;min-height:100vh;place-items:center;background:#f3f5f4;color:#171a1f;font-family:system-ui,sans-serif;letter-spacing:0}main{max-width:560px;padding:32px}strong{color:#156f4a;font-size:13px}h1{font-family:Georgia,serif;font-size:40px;letter-spacing:0}p{line-height:1.7}a{color:#156f4a}</style></head><body><main><strong>${statusCode}</strong><h1>요청을 처리할 수 없습니다</h1><p>${escapeHtml(message)}</p><a href="${escapeHtml(basePath)}">뉴스로 돌아가기</a></main></body></html>`;
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!/^\/[A-Za-z0-9/_-]*$/.test(trimmed) || trimmed.includes("//") || trimmed.split("/").includes("..")) {
    throw new Error("publicBasePath must be an absolute path");
  }
  return trimmed.length > 1 && trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
