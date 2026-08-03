import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCronHttpServer } from "./cron/cron-http-server.js";
import { runHermesCron } from "./cron/run-hermes-cron.js";
import type { DigestCandidate, DigestWithItems, SocialSignalItem } from "./domain/types.js";
import { createLlmWikiStore } from "./db/llm-wiki-store.js";
import { openSqliteDatabase } from "./db/sqlite.js";
import type { DigestIntelligenceProvider } from "./llm/digest-intelligence.js";
import { resolveProjectPath } from "./security/path-scope.js";
import type { SourceFetcher } from "./sources/fetch-cache.js";
import { ingestSources } from "./sources/ingest-sources.js";
import { DEFAULT_SOURCE_CONFIG_PATH, loadSourceConfigs } from "./sources/source-config.js";
import { runTrendSynthesis } from "./synthesis/run-synthesis.js";
import { selectDigestCandidates } from "./synthesis/select-digest-candidates.js";
import { renderSlackDigest } from "./slack/render-slack-digest.js";
import { buildSlackDigestAsync, sendSlackDigest, type SlackWebhookSender } from "./slack/send-slack-digest.js";
import { sendSlackWebhook as defaultSendSlackWebhook } from "./slack/slack-webhook.js";
import { importManualSocialSignals } from "./social/manual-import.js";
import {
  DEFAULT_SOCIAL_SOURCE_CONFIG_PATH,
  loadSocialSignalSources
} from "./social/social-source-config.js";
import { pollSocialSignals } from "./social/live-polling.js";

const DEFAULT_DB_PATH = "data/llm-wiki.sqlite";
const DEFAULT_SAMPLE_DATE = "2026-07-29";

interface CliOptions {
  dbPath: string;
  sourceConfigPath: string;
  socialConfigPath: string;
  socialImportPath?: string;
  socialSourceId?: string;
  forceRefresh: boolean;
  forceSend: boolean;
  dryRun: boolean;
  send: boolean;
  force: boolean;
  llmDigestIntelligence: boolean;
  cacheRoot?: string;
  date?: string;
  limit: number;
  outPath?: string;
  port: number;
}

interface CliDependencies {
  env?: Record<string, string | undefined>;
  sendSlackWebhook?: SlackWebhookSender;
  llmDigestProvider?: DigestIntelligenceProvider | null;
  fetcher?: SourceFetcher;
  stdout?: (value: string) => void;
}

async function main(): Promise<void> {
  await runCliCommand(process.argv.slice(2));
}

export async function runCliCommand(argv: string[], dependencies: CliDependencies = {}): Promise<void> {
  const [command, ...args] = argv;
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
    case "digest:candidates":
      runDigestCandidates(options);
      break;
    case "wiki:query":
      queryWiki(options);
      break;
    case "wiki:index":
      writeWikiIndex(options);
      break;
    case "slack:preview":
      await previewSlack(options, dependencies);
      break;
    case "slack:send":
      await sendSlack(options, dependencies);
      break;
    case "cron:run":
      await runCron(options, dependencies);
      break;
    case "cron:serve":
      await serveCron(options, dependencies);
      break;
    case "social:validate":
      validateSocialSources(options);
      break;
    case "social:import":
      importSocialSignals(options);
      break;
    case "social:list":
      listSocialSignals(options);
      break;
    case "social:poll":
      await pollSocial(options, dependencies);
      break;
    default:
      printUsageAndExit(command);
  }
}

function validateSocialSources(options: CliOptions): void {
  const socialConfigPath = resolveProjectPath(options.socialConfigPath, "social source config path");
  const sources = loadSocialSignalSources(socialConfigPath, { includeDisabled: true });
  const enabledSources = sources.filter((source) => source.enabled);

  console.log(
    JSON.stringify(
      {
        configPath: socialConfigPath,
        sourceCount: sources.length,
        enabledSourceCount: enabledSources.length,
        enabledSourceIds: enabledSources.map((source) => source.id),
        deferredSourceIds: sources
          .filter((source) => source.platform === "x" || source.platform === "threads")
          .map((source) => source.id)
      },
      null,
      2
    )
  );
}

function importSocialSignals(options: CliOptions): void {
  if (options.socialImportPath === undefined) {
    throw new Error("Missing required option: --input=PATH");
  }
  if (options.socialSourceId === undefined) {
    throw new Error("Missing required option: --source-id=ID");
  }

  const sources = loadSocialSignalSources(resolveProjectPath(options.socialConfigPath, "social source config path"), {
    includeDisabled: true
  });
  const source = sources.find((candidate) => candidate.id === options.socialSourceId);
  if (source === undefined) {
    throw new Error(`Unknown social source id: ${options.socialSourceId}`);
  }
  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();
    const result = importManualSocialSignals({
      source,
      store,
      jsonlPath: resolveProjectPath(options.socialImportPath, "social import path")
    });

    console.log(
      JSON.stringify(
        {
          sourceId: result.sourceId,
          importedCount: result.importedCount,
          items: result.items.map(formatSocialSignalItem)
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

function listSocialSignals(options: CliOptions): void {
  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();
    const items = store.listSocialSignalItems(options.socialSourceId);
    console.log(
      JSON.stringify(
        {
          itemCount: items.length,
          items: items.map(formatSocialSignalItem)
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

async function pollSocial(options: CliOptions, dependencies: CliDependencies = {}): Promise<void> {
  if (options.date === undefined) {
    throw new Error("Missing required option: --date=YYYY-MM-DD");
  }

  const env = dependencies.env ?? process.env;
  const sources = loadSocialSignalSources(resolveProjectPath(options.socialConfigPath, "social source config path", env));
  const selectedSources =
    options.socialSourceId === undefined ? sources : sources.filter((source) => source.id === options.socialSourceId);
  if (options.socialSourceId !== undefined && selectedSources.length === 0) {
    throw new Error(`Unknown or disabled social source id: ${options.socialSourceId}`);
  }
  const { db, store } = openStore(options.dbPath, env);

  try {
    store.initialize();
    const result = await pollSocialSignals({
      store,
      sources: selectedSources,
      reportDate: options.date,
      dryRun: options.dryRun,
      forceRefresh: options.forceRefresh,
      ...(options.cacheRoot === undefined ? {} : { cacheRoot: resolveProjectPath(options.cacheRoot, "cache root", env) }),
      ...(dependencies.fetcher === undefined ? {} : { fetcher: dependencies.fetcher })
    });

    (dependencies.stdout ?? console.log)(
      JSON.stringify(
        {
          ...result,
          results: result.results.map((sourceResult) => ({
            ...sourceResult,
            items: sourceResult.items.map(formatSocialSignalItem)
          }))
        },
        null,
        2
      )
    );
  } finally {
    db.close();
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
  const sourceConfigPath = resolveProjectPath(options.sourceConfigPath, "source config path");
  const sources = loadSourceConfigs(sourceConfigPath, { includeDisabled: true });
  const enabledSources = sources.filter((source) => source.enabled);

  console.log(
    JSON.stringify(
      {
        configPath: sourceConfigPath,
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

  const sources = loadSourceConfigs(resolveProjectPath(options.sourceConfigPath, "source config path"));
  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();
    const ingestOptions = {
      reportDate: options.date,
      forceRefresh: options.forceRefresh,
      ...(options.cacheRoot === undefined ? {} : { cacheRoot: resolveProjectPath(options.cacheRoot, "cache root") })
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

function runDigestCandidates(options: CliOptions): void {
  if (options.date === undefined) {
    throw new Error("Missing required option: --date=YYYY-MM-DD");
  }

  const sources = loadSourceConfigs(resolveProjectPath(options.sourceConfigPath, "source config path"), {
    includeDisabled: true
  });
  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();
    const synthesisResult = runTrendSynthesis({
      store,
      reportDate: options.date,
      sources,
      limit: options.limit
    });
    const candidates = selectDigestCandidates({
      store,
      reportDate: options.date,
      limit: options.limit
    });

    console.log(
      JSON.stringify(
        {
          ...synthesisResult,
          limit: options.limit,
          candidates: candidates.map(formatDigestCandidate)
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

function queryWiki(options: CliOptions): void {
  if (options.date === undefined) {
    throw new Error("Missing required option: --date=YYYY-MM-DD");
  }

  const sources = loadSourceConfigs(resolveProjectPath(options.sourceConfigPath, "source config path"), {
    includeDisabled: true
  });
  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();
    runTrendSynthesis({
      store,
      reportDate: options.date,
      sources,
      limit: options.limit
    });
    const candidates = selectDigestCandidates({
      store,
      reportDate: options.date,
      limit: options.limit
    });

    console.log(
      JSON.stringify(
        {
          reportDate: options.date,
          itemCount: candidates.length,
          items: candidates.map(formatDigestCandidate)
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

function writeWikiIndex(options: CliOptions): void {
  const outPath = options.outPath ?? "docs/wiki/index.md";
  const reportDate = options.date ?? new Date().toISOString().slice(0, 10);
  const sources = loadSourceConfigs(resolveProjectPath(options.sourceConfigPath, "source config path"), {
    includeDisabled: true
  });
  const { db, store } = openStore(options.dbPath);

  try {
    store.initialize();
    runTrendSynthesis({
      store,
      reportDate,
      sources,
      limit: options.limit
    });
    const candidates = selectDigestCandidates({
      store,
      reportDate,
      limit: options.limit
    });
    const rendered = renderWikiIndex(reportDate, candidates);
    const resolvedOutPath = resolveProjectPath(outPath, "wiki index output path");

    mkdirSync(dirname(resolvedOutPath), { recursive: true });
    writeFileSync(resolvedOutPath, rendered);

    console.log(
      JSON.stringify(
        {
          reportDate,
          outPath,
          itemCount: candidates.length
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

async function previewSlack(options: CliOptions, dependencies: CliDependencies = {}): Promise<void> {
  if (options.date === undefined) {
    throw new Error("Missing required option: --date=YYYY-MM-DD");
  }

  const env = dependencies.env ?? process.env;
  const { db, store } = openStore(options.dbPath, env);

  try {
    store.initialize();
    const sources = loadSourceConfigs(resolveProjectPath(options.sourceConfigPath, "source config path", env), {
      includeDisabled: true
    });
    const built = await buildSlackDigestAsync({
      store,
      reportDate: options.date,
      sources,
      limit: options.limit,
      enableLlmDigestIntelligence: options.llmDigestIntelligence,
      ...(dependencies.llmDigestProvider === undefined ? {} : { llmDigestProvider: dependencies.llmDigestProvider })
    });
    (dependencies.stdout ?? console.log)(
      JSON.stringify(
        {
          reportDate: options.date,
          mode: "preview",
          candidateCount: built.candidateCount,
          payload: built.payload
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

async function sendSlack(options: CliOptions, dependencies: CliDependencies = {}): Promise<void> {
  if (options.date === undefined) {
    throw new Error("Missing required option: --date=YYYY-MM-DD");
  }

  const env = dependencies.env ?? process.env;
  const webhookUrl = env.SLACK_WEBHOOK_URL;
  if (webhookUrl === undefined || webhookUrl.trim().length === 0) {
    throw new Error("Missing required environment variable: SLACK_WEBHOOK_URL");
  }

  const { db, store } = openStore(options.dbPath, env);

  try {
    store.initialize();
    const sources = loadSourceConfigs(resolveProjectPath(options.sourceConfigPath, "source config path", env), {
      includeDisabled: true
    });
    const result = await sendSlackDigest({
      store,
      reportDate: options.date,
      sources,
      limit: options.limit,
      webhookUrl,
      forceSend: options.forceSend,
      enableLlmDigestIntelligence: options.llmDigestIntelligence,
      ...(dependencies.llmDigestProvider === undefined ? {} : { llmDigestProvider: dependencies.llmDigestProvider }),
      sendSlackWebhook: dependencies.sendSlackWebhook ?? defaultSendSlackWebhook
    });

    (dependencies.stdout ?? console.log)(
      JSON.stringify(
        {
          reportDate: options.date,
          sent: result.sent,
          attempt: result.attempt
        },
        null,
        2
      )
    );

    if (!result.sent) {
      process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

async function runCron(options: CliOptions, dependencies: CliDependencies = {}): Promise<void> {
  const env = dependencies.env ?? process.env;
  const sources = loadSourceConfigs(resolveProjectPath(options.sourceConfigPath, "source config path", env));
  const { db, store } = openStore(options.dbPath, env);

  try {
    store.initialize();
    const result = await runHermesCron({
      store,
      sources,
      mode: resolveCronMode(options, env),
      limit: options.limit,
      force: options.force,
      forceRefresh: options.forceRefresh,
      enableLlmDigestIntelligence: options.llmDigestIntelligence,
      ...(dependencies.llmDigestProvider === undefined ? {} : { llmDigestProvider: dependencies.llmDigestProvider }),
      sendSlackWebhook: dependencies.sendSlackWebhook ?? defaultSendSlackWebhook,
      ...(options.date === undefined ? {} : { reportDate: options.date }),
      ...(options.cacheRoot === undefined ? {} : { cacheRoot: resolveProjectPath(options.cacheRoot, "cache root", env) }),
      ...(env.SLACK_WEBHOOK_URL === undefined ? {} : { webhookUrl: env.SLACK_WEBHOOK_URL }),
      ...(dependencies.fetcher === undefined ? {} : { fetcher: dependencies.fetcher })
    });

    (dependencies.stdout ?? console.log)(JSON.stringify(toCronOutput(result), null, 2));
    if (result.status !== "success") {
      process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

async function serveCron(options: CliOptions, dependencies: CliDependencies = {}): Promise<void> {
  const env = dependencies.env ?? process.env;
  const { db, store } = openStore(options.dbPath, env);
  store.initialize();
  const sources = loadSourceConfigs(resolveProjectPath(options.sourceConfigPath, "source config path", env));
  const server = createCronHttpServer({
    env,
    buildInput: (request) => {
      return {
        store,
        sources,
        mode: request.mode ?? resolveCronMode(options, env),
        limit: options.limit,
        force: request.force === true || options.force,
        forceRefresh: options.forceRefresh,
        enableLlmDigestIntelligence: options.llmDigestIntelligence,
        ...(dependencies.llmDigestProvider === undefined ? {} : { llmDigestProvider: dependencies.llmDigestProvider }),
        sendSlackWebhook: dependencies.sendSlackWebhook ?? defaultSendSlackWebhook,
        ...(request.reportDate === undefined ? {} : { reportDate: request.reportDate }),
        ...(options.cacheRoot === undefined ? {} : { cacheRoot: resolveProjectPath(options.cacheRoot, "cache root", env) }),
        ...(env.SLACK_WEBHOOK_URL === undefined ? {} : { webhookUrl: env.SLACK_WEBHOOK_URL }),
        ...(dependencies.fetcher === undefined ? {} : { fetcher: dependencies.fetcher })
      };
    }
  });
  server.on("close", () => db.close());

  await new Promise<void>((resolveListen) => {
    server.listen(options.port, () => {
      (dependencies.stdout ?? console.log)(`Hermes cron server listening on port ${options.port}`);
      resolveListen();
    });
  });
}

function resolveCronMode(options: CliOptions, env: Record<string, string | undefined>) {
  if (options.dryRun && options.send) {
    throw new Error("Choose only one cron mode: --dry-run or --send");
  }
  if (options.send) {
    return "send";
  }
  if (options.dryRun) {
    return "dry_run";
  }
  if (env.CRON_DEFAULT_MODE === "send") {
    return "send";
  }

  return "dry_run";
}

function toCronOutput(result: Awaited<ReturnType<typeof runHermesCron>>) {
  return {
    reportDate: result.reportDate,
    mode: result.mode,
    status: result.status,
    idempotencyKey: result.idempotencyKey,
    cronRun: result.cronRun,
    candidateCount: result.candidateCount,
    slackAttemptId: result.slackAttempt?.id ?? null,
    payload: result.payload,
    errorMessage: result.errorMessage
  };
}

function openStore(dbPath: string, env: Record<string, string | undefined> = process.env) {
  const resolvedDbPath = resolveProjectPath(dbPath, "SQLite database path", env);
  mkdirSync(dirname(resolvedDbPath), { recursive: true });

  const db = openSqliteDatabase(resolvedDbPath);
  return { db, store: createLlmWikiStore(db) };
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    dbPath: process.env.LLM_WIKI_DB_PATH ?? DEFAULT_DB_PATH,
    sourceConfigPath: process.env.SOURCE_CONFIG_PATH ?? DEFAULT_SOURCE_CONFIG_PATH,
    socialConfigPath: process.env.SOCIAL_SOURCE_CONFIG_PATH ?? DEFAULT_SOCIAL_SOURCE_CONFIG_PATH,
    forceRefresh: false,
    forceSend: false,
    dryRun: false,
    send: false,
    force: false,
    llmDigestIntelligence: process.env.LLM_DIGEST_ENABLED === "true",
    port: 3000,
    limit: 5
  };

  for (const arg of args) {
    if (arg.startsWith("--date=")) {
      options.date = parseReportDate(arg.slice("--date=".length));
    } else if (arg.startsWith("--db=")) {
      options.dbPath = arg.slice("--db=".length);
    } else if (arg.startsWith("--config=")) {
      options.sourceConfigPath = arg.slice("--config=".length);
    } else if (arg.startsWith("--social-config=")) {
      options.socialConfigPath = arg.slice("--social-config=".length);
    } else if (arg.startsWith("--source-id=")) {
      options.socialSourceId = arg.slice("--source-id=".length);
    } else if (arg.startsWith("--input=")) {
      options.socialImportPath = arg.slice("--input=".length);
    } else if (arg === "--force-refresh") {
      options.forceRefresh = true;
    } else if (arg === "--force-send") {
      options.forceSend = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--send") {
      options.send = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--llm-digest") {
      options.llmDigestIntelligence = true;
    } else if (arg.startsWith("--cache-root=")) {
      options.cacheRoot = arg.slice("--cache-root=".length);
    } else if (arg.startsWith("--limit=")) {
      options.limit = parsePositiveInteger(arg.slice("--limit=".length), "--limit");
    } else if (arg.startsWith("--out=")) {
      options.outPath = arg.slice("--out=".length);
    } else if (arg.startsWith("--port=")) {
      options.port = parsePositiveInteger(arg.slice("--port=".length), "--port");
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function formatSocialSignalItem(item: SocialSignalItem) {
  return {
    id: item.id,
    sourceId: item.sourceId,
    platform: item.platform,
    authorHandle: item.authorHandle,
    url: item.url,
    canonicalUrl: item.canonicalUrl,
    text: item.text,
    publishedAt: item.publishedAt,
    collectedAt: item.collectedAt,
    outboundUrls: item.outboundUrls,
    confirmationStatus: item.confirmationStatus,
    linkedOfficialEvidenceIds: item.linkedOfficialEvidenceIds
  };
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

function formatDigestCandidate(candidate: DigestCandidate) {
  return {
    id: candidate.assessment.id,
    trendItemId: candidate.trendItem.id,
    title: candidate.trendItem.title,
    canonicalUrl: candidate.trendItem.canonicalUrl,
    sourceName: candidate.trendItem.sourceName,
    publishedAt: candidate.trendItem.publishedAt,
    summary: candidate.assessment.summary,
    whyItMatters: candidate.assessment.whyItMatters,
    practicalImpact: candidate.assessment.practicalImpact,
    trendCategory: candidate.assessment.trendCategory,
    actionLevel: candidate.assessment.actionLevel,
    confirmationStatus: candidate.assessment.confirmationStatus,
    confidence: candidate.assessment.confidence,
    importanceScore: candidate.assessment.importanceScore,
    contradictionNotes: candidate.assessment.contradictionNotes,
    stalenessPolicy: candidate.assessment.stalenessPolicy,
    lineage: candidate.lineage
  };
}

function renderWikiIndex(reportDate: string, candidates: DigestCandidate[]): string {
  const lines = [
    "# LLM Wiki Index",
    "",
    `Report date: ${reportDate}`,
    "",
    "## Digest Candidates",
    ""
  ];

  if (candidates.length === 0) {
    lines.push("No digest candidates found.");
  } else {
    candidates.forEach((candidate, index) => {
      lines.push(
        `${index + 1}. ${candidate.trendItem.title}`,
        `   - ID: ${candidate.assessment.id}`,
        `   - Score: ${candidate.assessment.importanceScore}`,
        `   - Action: ${candidate.assessment.actionLevel}`,
        `   - Source: ${candidate.trendItem.canonicalUrl}`
      );
    });
  }

  lines.push("");
  return lines.join("\n");
}

function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return parsed;
}

function parseReportDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("--date must use YYYY-MM-DD format");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("--date must be a valid calendar date");
  }

  return value;
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
      "  npm run digest:candidates -- --date=YYYY-MM-DD --limit=5",
      "  npm run wiki:query -- --date=YYYY-MM-DD",
      "  npm run wiki:index -- --date=YYYY-MM-DD --out=docs/wiki/index.md",
      "  npm run slack:preview -- --date=YYYY-MM-DD --limit=5",
      "  npm run slack:send -- --date=YYYY-MM-DD --limit=5",
      "  npm run social:validate",
      "  npm run social:import -- --source-id=manual-public-ai-links --input=PATH",
      "  npm run social:list",
      "  npm run social:poll -- --date=YYYY-MM-DD --dry-run",
      "Options:",
      "  --db=PATH          Override the SQLite database path",
      "  --config=PATH      Override the source registry config path",
      "  --social-config=PATH Override the social source registry config path",
      "  --source-id=ID     Select a social source id",
      "  --input=PATH       Input path for social:import",
      "  --cache-root=PATH  Override the source cache root",
      "  --force-refresh    Bypass source cache",
      "  --force-send       Allow slack:send to resend an identical successful payload",
      "  --llm-digest       Enable injectable LLM digest enrichment when a provider is configured",
      "  --limit=N          Limit candidate output",
      "  --out=PATH         Output path for wiki:index"
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
