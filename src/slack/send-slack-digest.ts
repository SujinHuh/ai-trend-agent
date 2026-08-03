import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import type { SlackDeliveryAttempt, SlackWebhookPayload } from "../domain/types.js";
import type { DigestIntelligenceProvider } from "../llm/digest-intelligence.js";
import { enrichDigestCandidatesWithLlm } from "../llm/digest-intelligence.js";
import type { NormalizedSourceConfig } from "../sources/source-config.js";
import { runTrendSynthesis } from "../synthesis/run-synthesis.js";
import { selectDigestCandidates } from "../synthesis/select-digest-candidates.js";
import { renderSlackDigest } from "./render-slack-digest.js";
import { createPayloadHash, sendSlackWebhook as defaultSendSlackWebhook } from "./slack-webhook.js";

export type SlackWebhookSender = typeof defaultSendSlackWebhook;

export interface BuildSlackDigestInput {
  store: LlmWikiStore;
  reportDate: string;
  sources: NormalizedSourceConfig[];
  limit: number;
  llmDigestProvider?: DigestIntelligenceProvider | null;
  enableLlmDigestIntelligence?: boolean;
}

export interface BuiltSlackDigest {
  reportDate: string;
  candidateCount: number;
  payload: SlackWebhookPayload;
  payloadHash: string;
}

export interface SendSlackDigestInput extends BuildSlackDigestInput {
  webhookUrl: string;
  forceSend?: boolean;
  sendSlackWebhook?: SlackWebhookSender;
}

export interface SendSlackDigestResult {
  reportDate: string;
  sent: boolean;
  candidateCount: number;
  payloadHash: string;
  attempt: SlackDeliveryAttempt;
}

export function buildSlackDigest(input: BuildSlackDigestInput): BuiltSlackDigest {
  runTrendSynthesis({
    store: input.store,
    reportDate: input.reportDate,
    sources: input.sources,
    limit: input.limit
  });
  if (input.enableLlmDigestIntelligence === true && input.llmDigestProvider != null) {
    throw new Error("Use buildSlackDigestAsync when LLM digest intelligence is enabled.");
  }
  const candidates = selectDigestCandidates({
    store: input.store,
    reportDate: input.reportDate,
    limit: input.limit
  });
  const payload = renderSlackDigest({
    reportDate: input.reportDate,
    candidates,
    limit: input.limit
  });
  const payloadHash = createPayloadHash(JSON.stringify(payload));

  return {
    reportDate: input.reportDate,
    candidateCount: candidates.length,
    payload,
    payloadHash
  };
}

export async function buildSlackDigestAsync(input: BuildSlackDigestInput): Promise<BuiltSlackDigest> {
  runTrendSynthesis({
    store: input.store,
    reportDate: input.reportDate,
    sources: input.sources,
    limit: input.limit
  });
  await enrichDigestCandidatesWithLlm({
    store: input.store,
    reportDate: input.reportDate,
    enabled: input.enableLlmDigestIntelligence === true,
    limit: input.limit,
    ...(input.llmDigestProvider === undefined ? {} : { provider: input.llmDigestProvider })
  });
  const candidates = selectDigestCandidates({
    store: input.store,
    reportDate: input.reportDate,
    limit: input.limit
  });
  const payload = renderSlackDigest({
    reportDate: input.reportDate,
    candidates,
    limit: input.limit
  });
  const payloadHash = createPayloadHash(JSON.stringify(payload));

  return {
    reportDate: input.reportDate,
    candidateCount: candidates.length,
    payload,
    payloadHash
  };
}

export async function sendSlackDigest(input: SendSlackDigestInput): Promise<SendSlackDigestResult> {
  const built =
    input.enableLlmDigestIntelligence === true
      ? await buildSlackDigestAsync(input)
      : buildSlackDigest(input);
  const previousSuccess = input.store.findSuccessfulSlackDeliveryAttempt(input.reportDate, built.payloadHash);

  if (previousSuccess !== null && input.forceSend !== true) {
    throw new Error(
      [
        `Slack digest already sent for ${input.reportDate} with this payload.`,
        `Previous attempt: ${previousSuccess.id}.`,
        "Use --force-send to send it again."
      ].join(" ")
    );
  }

  const result = await (input.sendSlackWebhook ?? defaultSendSlackWebhook)({
    webhookUrl: input.webhookUrl,
    payload: built.payload
  });
  const attempt = input.store.saveSlackDeliveryAttempt({
    reportDate: input.reportDate,
    webhookHost: result.webhookHost,
    status: result.ok ? "success" : "failed",
    httpStatusCode: result.httpStatusCode,
    errorMessage: result.errorMessage,
    sentAt: result.sentAt,
    payloadHash: result.payloadHash
  });

  return {
    reportDate: input.reportDate,
    sent: result.ok,
    candidateCount: built.candidateCount,
    payloadHash: built.payloadHash,
    attempt
  };
}
