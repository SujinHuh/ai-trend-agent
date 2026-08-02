import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { CronRunMode } from "../domain/types.js";
import { redactSecretText } from "../slack/slack-webhook.js";
import { runHermesCron, type RunHermesCronInput, type RunHermesCronResult } from "./run-hermes-cron.js";

const MAX_CRON_BODY_BYTES = 8192;

export interface CronHttpServerOptions {
  buildInput: (request: CronHttpRequest) => RunHermesCronInput;
  env?: Record<string, string | undefined>;
  runCron?: (input: RunHermesCronInput) => Promise<RunHermesCronResult>;
}

export interface CronHttpRequest {
  mode?: CronRunMode;
  reportDate?: string;
  force?: boolean;
}

export function createCronHttpServer(options: CronHttpServerOptions): Server {
  return createServer(async (request, response) => {
    await handleCronHttpRequest(request, response, options);
  });
}

async function handleCronHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: CronHttpServerOptions
): Promise<void> {
  if (request.method !== "POST" || request.url?.split("?")[0] !== "/cron") {
    writeJson(response, 405, {
      ok: false,
      error: "Only POST /cron is supported"
    });
    return;
  }

  const secret = options.env?.CRON_SECRET;
  const requireSecret = isCronSecretRequired(options.env);
  if (requireSecret && (secret === undefined || secret.trim().length === 0)) {
    writeJson(response, 503, {
      ok: false,
      error: "CRON_SECRET is required"
    });
    return;
  }
  if (secret !== undefined && secret.trim().length > 0 && !hasCronSecret(request, secret)) {
    writeJson(response, 401, {
      ok: false,
      error: "Unauthorized"
    });
    return;
  }

  try {
    const cronRequest = await readCronRequest(request, {
      allowForce: options.env?.CRON_ALLOW_FORCE === "true"
    });
    const result = await (options.runCron ?? runHermesCron)(options.buildInput(cronRequest));
    writeJson(response, result.status === "success" ? 200 : 409, toCronHttpResponse(result));
  } catch (error: unknown) {
    writeJson(response, getHttpErrorStatus(error), {
      ok: false,
      error: redactSecretText(error instanceof Error ? error.message : String(error))
    });
  }
}

function hasCronSecret(request: IncomingMessage, secret: string): boolean {
  return request.headers.authorization === `Bearer ${secret}` || request.headers["x-cron-secret"] === secret;
}

async function readCronRequest(request: IncomingMessage, options: { allowForce: boolean }): Promise<CronHttpRequest> {
  const contentType = request.headers["content-type"];
  if (contentType !== undefined && !String(contentType).includes("application/json")) {
    throw Object.assign(new Error("Content-Type must be application/json"), { statusCode: 415 });
  }

  const body = await readBody(request);
  if (body.trim().length === 0) {
    return {};
  }

  const parsed = JSON.parse(body) as {
    mode?: string;
    date?: string;
    reportDate?: string;
    force?: boolean;
  };
  const mode = parseMode(parsed.mode);

  const reportDate = parsed.reportDate ?? parsed.date;

  return {
    ...(mode === undefined ? {} : { mode }),
    ...(reportDate === undefined ? {} : { reportDate }),
    ...(parsed.force === true && options.allowForce ? { force: true } : {})
  };
}

function parseMode(value: string | undefined): CronRunMode | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "dry_run" || value === "send") {
    return value;
  }

  throw new Error("mode must be dry_run or send");
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > MAX_CRON_BODY_BYTES) {
      throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function isCronSecretRequired(env: Record<string, string | undefined> | undefined): boolean {
  if (env?.CRON_REQUIRE_SECRET === "true") {
    return true;
  }
  return env?.NODE_ENV === "production";
}

function toCronHttpResponse(result: RunHermesCronResult) {
  return {
    ok: result.status === "success",
    result: {
      runId: result.cronRun.id,
      reportDate: result.reportDate,
      mode: result.mode,
      status: result.status,
      candidateCount: result.candidateCount,
      slackAttemptId: result.slackAttempt?.id ?? null,
      ...(result.errorMessage === null ? {} : { errorMessage: redactSecretText(result.errorMessage) })
    }
  };
}

function getHttpErrorStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = Number((error as { statusCode: unknown }).statusCode);
    if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
      return statusCode;
    }
  }

  return 400;
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json"
  });
  response.end(JSON.stringify(body, null, 2));
}
