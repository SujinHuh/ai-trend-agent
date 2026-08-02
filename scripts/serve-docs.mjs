import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, join, normalize, relative, resolve } from "node:path";

const root = resolve("docs");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"]
]);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = url.pathname === "/" ? "/showcase/001_llm_wiki_local_store/completion.html" : url.pathname;
  const requestedPath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(root, requestedPath));

  if (!isInside(root, filePath) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes.get(extname(filePath)) ?? "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
});

function isInside(rootPath, candidatePath) {
  const relativePath = relative(rootPath, candidatePath);
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

server.listen(port, host, () => {
  console.log(`Docs server running at http://${host}:${port}/showcase/001_llm_wiki_local_store/completion.html`);
  console.log(`Browser URL: http://127.0.0.1:${port}/showcase/001_llm_wiki_local_store/completion.html`);
  console.log(`Task 002 URL: http://127.0.0.1:${port}/showcase/002_ai_official_source_ingestion/completion.html`);
});
