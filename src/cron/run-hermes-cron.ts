import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import type { CronRun, CronRunMode, SlackDeliveryAttempt, SlackWebhookPayload } from "../domain/types.js";
import type { DigestIntelligenceProvider } from "../llm/digest-intelligence.js";
import { ingestSources } from "../sources/ingest-sources.js";
import type { SourceFetcher } from "../sources/fetch-cache.js";
import type { NormalizedSourceConfig } from "../sources/source-config.js";
import { buildSlackDigestAsync, sendSlackDigest, type SlackWebhookSender } from "../slack/send-slack-digest.js";
import { redactSecretText } from "../slack/slack-webhook.js";

export const DEFAULT_CRON_LIMIT = 5;
export const DEFAULT_CRON_MODE: CronRunMode = "dry_run";

export interface RunHermesCronInput {
  store: LlmWikiStore;
  sources: NormalizedSourceConfig[];
  reportDate?: string;
  mode?: CronRunMode;
  limit?: number;
  force?: boolean;
  forceRefresh?: boolean;
  cacheRoot?: string;
  webhookUrl?: string;
  sendSlackWebhook?: SlackWebhookSender;
  fetcher?: SourceFetcher;
  llmDigestProvider?: DigestIntelligenceProvider | null;
  enableLlmDigestIntelligence?: boolean;
  now?: () => Date;
}

export interface RunHermesCronResult {
  reportDate: string;
  mode: CronRunMode;
  status: "success" | "failed";
  idempotencyKey: string;
  cronRun: CronRun;
  candidateCount: number;
  slackAttempt: SlackDeliveryAttempt | null;
  payload: SlackWebhookPayload | null;
  errorMessage: string | null;
}

export async function runHermesCron(input: RunHermesCronInput): Promise<RunHermesCronResult> {
  const now = input.now ?? (() => new Date());
  const mode = input.mode ?? DEFAULT_CRON_MODE;
  const limit = input.limit ?? DEFAULT_CRON_LIMIT;
  const reportDate = input.reportDate ?? getKstReportDate(now());
  const idempotencyKey = createHermesCronIdempotencyKey(reportDate);
  const startedAt = now().toISOString();

  if (mode === "send" && input.force !== true) {
    const previousSuccess = input.store.findSuccessfulCronRun(idempotencyKey, "send");
    if (previousSuccess !== null) {
      return {
        reportDate,
        mode,
        status: "failed",
        idempotencyKey,
        cronRun: previousSuccess,
        candidateCount: previousSuccess.candidateCount ?? 0,
        slackAttempt: null,
        payload: null,
        errorMessage: `Hermes cron already succeeded for ${reportDate}. Previous run: ${previousSuccess.id}.`
      };
    }
  }

  let cronRun: CronRun;
  try {
    cronRun = input.store.createCronRun({
      idempotencyKey: input.force === true ? `${idempotencyKey}:force:${startedAt}` : idempotencyKey,
      reportDate,
      mode,
      startedAt,
      stepName: "started"
    });
  } catch (error: unknown) {
    if (mode === "send" && input.force !== true && isUniqueConstraintError(error)) {
      const runningRun = input.store.findRunningCronRun(idempotencyKey, "send");
      if (runningRun !== null) {
        return {
          reportDate,
          mode,
          status: "failed",
          idempotencyKey,
          cronRun: runningRun,
          candidateCount: runningRun.candidateCount ?? 0,
          slackAttempt: null,
          payload: null,
          errorMessage: `Hermes cron is already running for ${reportDate}. Active run: ${runningRun.id}.`
        };
      }
    }

    throw error;
  }
  let candidateCount = 0;
  let slackAttempt: SlackDeliveryAttempt | null = null;
  let payload: SlackWebhookPayload | null = null;

  try {
    await ingestSources(input.sources, input.store, {
      reportDate,
      now,
      ...(input.forceRefresh === undefined ? {} : { forceRefresh: input.forceRefresh }),
      ...(input.cacheRoot === undefined ? {} : { cacheRoot: input.cacheRoot }),
      ...(input.fetcher === undefined ? {} : { fetcher: input.fetcher })
    });

    if (mode === "dry_run") {
      const built = await buildSlackDigestAsync({
        store: input.store,
        reportDate,
        sources: input.sources,
        limit,
        ...(input.llmDigestProvider === undefined ? {} : { llmDigestProvider: input.llmDigestProvider }),
        ...(input.enableLlmDigestIntelligence === undefined
          ? {}
          : { enableLlmDigestIntelligence: input.enableLlmDigestIntelligence })
      });
      candidateCount = built.candidateCount;
      payload = built.payload;
    } else {
      const webhookUrl = input.webhookUrl?.trim();
      if (webhookUrl === undefined || webhookUrl.length === 0) {
        throw new Error("Missing required environment variable: SLACK_WEBHOOK_URL");
      }

      const result = await sendSlackDigest({
        store: input.store,
        reportDate,
        sources: input.sources,
        limit,
        webhookUrl,
        ...(input.llmDigestProvider === undefined ? {} : { llmDigestProvider: input.llmDigestProvider }),
        ...(input.enableLlmDigestIntelligence === undefined
          ? {}
          : { enableLlmDigestIntelligence: input.enableLlmDigestIntelligence }),
        ...(input.force === undefined ? {} : { forceSend: input.force }),
        ...(input.sendSlackWebhook === undefined ? {} : { sendSlackWebhook: input.sendSlackWebhook })
      });
      candidateCount = result.candidateCount;
      slackAttempt = result.attempt;

      if (!result.sent) {
        throw new Error(result.attempt.errorMessage ?? "Slack send failed");
      }
    }

    cronRun = input.store.markCronRunSuccess(cronRun.id, {
      finishedAt: now().toISOString(),
      stepName: "complete",
      candidateCount,
      slackAttemptId: slackAttempt?.id ?? null
    });

    return {
      reportDate,
      mode,
      status: "success",
      idempotencyKey,
      cronRun,
      candidateCount,
      slackAttempt,
      payload,
      errorMessage: null
    };
  } catch (error: unknown) {
    const errorMessage = sanitizeCronError(error);
    cronRun = input.store.markCronRunFailure(cronRun.id, {
      finishedAt: now().toISOString(),
      stepName: "failed",
      candidateCount,
      slackAttemptId: slackAttempt?.id ?? null,
      errorMessage
    });

    return {
      reportDate,
      mode,
      status: "failed",
      idempotencyKey,
      cronRun,
      candidateCount,
      slackAttempt,
      payload,
      errorMessage
    };
  }
}

export function createHermesCronIdempotencyKey(reportDate: string): string {
  return `hermes-cron:daily-digest:${reportDate}`;
}

export function getKstReportDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function sanitizeCronError(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return redactSecretText(value);
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}
