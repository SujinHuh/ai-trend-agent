import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { DigestWithItems } from "./domain/types.js";
import { createLlmWikiStore } from "./db/llm-wiki-store.js";
import { openSqliteDatabase } from "./db/sqlite.js";
import { ingestSources } from "./sources/ingest-sources.js";
import { DEFAULT_SOURCE_CONFIG_PATH, loadSourceConfigs } from "./sources/source-config.js";

const DEFAULT_DB_PATH = "data/llm-wiki.sqlite";
const DEFAULT_SAMPLE_DATE = "2026-07-29";

interface CliOptions {
  dbPath: string;
  sourceConfigPath: string;
  forceRefresh: boolean;
  cacheRoot?: string;
  date?: string;
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const options = parseOptions(args);

  switch (command) {
    case "db:init":
      initializeDatabase(options);
      break;
    case "sample:seed":
      seedSampleData(options);
      break;
    case "digest:get":
      getDigest(options);
      break;
    case "sources:validate":
      validateSources(options);
      break;
    case "ingest:run":
      await runIngestion(options);
      break;
    default:
      printUsageAndExit(command);
  }
}

function initializeDatabase(options: CliOptions): void {
  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();
    console.log(`Initialized LLM Wiki database: ${options.dbPath}`);
  } finally {
    db.close();
  }
}

function seedSampleData(options: CliOptions): void {
  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();

    const openAiItem = store.saveTrendItem({
      sourceUrl: "https://openai.com/news/sample-ai-signal?utm_source=slack#details",
      title: "Sample OpenAI product signal",
      sourceName: "OpenAI News",
      publishedAt: "2026-07-29T00:00:00.000Z"
    });

    const anthropicItem = store.saveTrendItem({
      sourceUrl: "http://anthropic.com/news/sample-research-update?ref=feed",
      title: "Sample Anthropic research update",
      sourceName: "Anthropic News",
      publishedAt: "2026-07-29T01:00:00.000Z"
    });

    const generatedAt = "2026-07-28T22:00:00.000Z";
    const digest = store.saveDigest({
      reportDate: DEFAULT_SAMPLE_DATE,
      generatedAt,
      trendItemIds: [openAiItem.id, anthropicItem.id]
    });

    store.saveSourceEvidence({
      trendItemId: openAiItem.id,
      sourceUrl: "https://openai.com/news/sample-ai-signal",
      sourceName: "OpenAI News",
      fetchedAt: "2026-07-28T21:55:00.000Z",
      evidenceExcerpt: "Sample evidence for an OpenAI AI trend signal.",
      confidenceScore: 0.9
    });

    store.saveSourceEvidence({
      trendItemId: anthropicItem.id,
      sourceUrl: "https://anthropic.com/news/sample-research-update",
      sourceName: "Anthropic News",
      fetchedAt: "2026-07-28T21:56:00.000Z",
      evidenceExcerpt: "Sample evidence for an Anthropic AI trend signal.",
      confidenceScore: 0.85
    });

    console.log(
      JSON.stringify(
        {
          dbPath: options.dbPath,
          digestId: digest.id,
          reportDate: digest.reportDate,
          itemCount: 2
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

function getDigest(options: CliOptions): void {
  if (options.date === undefined) {
    throw new Error("Missing required option: --date=YYYY-MM-DD");
  }

  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();
    const digest = store.getDigestByReportDate(options.date);

    if (digest === null) {
      console.log(JSON.stringify({ reportDate: options.date, digest: null }, null, 2));
      return;
    }

    console.log(JSON.stringify(formatDigest(digest), null, 2));
  } finally {
    db.close();
  }
}

function validateSources(options: CliOptions): void {
  const sources = loadSourceConfigs(options.sourceConfigPath, { includeDisabled: true });
  const enabledSources = sources.filter((source) => source.enabled);

  console.log(
    JSON.stringify(
      {
        configPath: options.sourceConfigPath,
        sourceCount: sources.length,
        enabledSourceCount: enabledSources.length,
        enabledSourceIds: enabledSources.map((source) => source.id)
      },
      null,
      2
    )
  );
}

async function runIngestion(options: CliOptions): Promise<void> {
  if (options.date === undefined) {
    throw new Error("Missing required option: --date=YYYY-MM-DD");
  }

  const sources = loadSourceConfigs(options.sourceConfigPath);
  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();
    const ingestOptions = {
      reportDate: options.date,
      forceRefresh: options.forceRefresh,
      ...(options.cacheRoot === undefined ? {} : { cacheRoot: options.cacheRoot })
    };
    const result = await ingestSources(sources, store, ingestOptions);

    console.log(
      JSON.stringify(
        {
          ...result,
          dbPath: options.dbPath,
          sourceConfigPath: options.sourceConfigPath
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

function openStore(dbPath: string) {
  const resolvedDbPath = resolve(dbPath);
  mkdirSync(dirname(resolvedDbPath), { recursive: true });

  const db = openSqliteDatabase(resolvedDbPath);
  return { db, store: createLlmWikiStore(db) };
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    dbPath: process.env.LLM_WIKI_DB_PATH ?? DEFAULT_DB_PATH,
    sourceConfigPath: process.env.SOURCE_CONFIG_PATH ?? DEFAULT_SOURCE_CONFIG_PATH,
    forceRefresh: false
  };

  for (const arg of args) {
    if (arg.startsWith("--date=")) {
      options.date = arg.slice("--date=".length);
    } else if (arg.startsWith("--db=")) {
      options.dbPath = arg.slice("--db=".length);
    } else if (arg.startsWith("--config=")) {
      options.sourceConfigPath = arg.slice("--config=".length);
    } else if (arg === "--force-refresh") {
      options.forceRefresh = true;
    } else if (arg.startsWith("--cache-root=")) {
      options.cacheRoot = arg.slice("--cache-root=".length);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function formatDigest(digest: DigestWithItems) {
  return {
    digest: digest.digest,
    items: digest.items.map((item) => ({
      ...item,
      evidence: digest.evidence.filter((evidence) => evidence.trendItemId === item.id)
    }))
  };
}

function printUsageAndExit(command: string | undefined): never {
  const commandLabel = command ?? "(missing)";
  throw new Error(
    [
      `Unknown command: ${commandLabel}`,
      "Usage:",
      "  npm run db:init",
      "  npm run sample:seed",
      "  npm run digest:get -- --date=YYYY-MM-DD",
      "  npm run sources:validate",
      "  npm run ingest:run -- --date=YYYY-MM-DD",
      "Options:",
      "  --db=PATH          Override the SQLite database path",
      "  --config=PATH      Override the source registry config path",
      "  --cache-root=PATH  Override the source cache root",
      "  --force-refresh    Bypass source cache"
    ].join("\n")
  );
}

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
const modulePath = fileURLToPath(import.meta.url);

if (invokedPath === modulePath) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
