import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createCronHttpServer } from "../src/cron/cron-http-server.js";
import type { RunHermesCronResult } from "../src/cron/run-hermes-cron.js";

const openServers: Array<{ close: (callback: () => void) => void }> = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => new Promise<void>((resolve) => server.close(resolve))));
});

describe("createCronHttpServer", () => {
  it("rejects non-POST cron requests", async () => {
    const { url } = await startServer();
    const response = await fetch(`${url}/cron`);

    expect(response.status).toBe(405);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "Only POST /cron is supported"
    });
  });

  it("enforces bearer auth when CRON_SECRET is configured", async () => {
    const { url } = await startServer({
      env: {
        CRON_SECRET: "secret"
      }
    });
    const response = await fetch(`${url}/cron`, {
      method: "POST",
      body: "{}"
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "Unauthorized"
    });
  });

  it("accepts x-cron-secret for Cloud Run OIDC compatibility", async () => {
    const runCron = vi.fn(async () => result("success"));
    const { url } = await startServer({
      env: {
        CRON_SECRET: "secret"
      },
      runCron
    });
    const response = await fetch(`${url}/cron`, {
      method: "POST",
      headers: {
        authorization: "Bearer oidc-token-from-cloud-run",
        "content-type": "application/json",
        "x-cron-secret": "secret"
      },
      body: JSON.stringify({
        mode: "dry_run"
      })
    });

    expect(response.status).toBe(200);
    expect(runCron).toHaveBeenCalledTimes(1);
  });

  it("rejects wrong x-cron-secret even when an OIDC-style Authorization header exists", async () => {
    const runCron = vi.fn(async () => result("success"));
    const { url } = await startServer({
      env: {
        CRON_SECRET: "secret"
      },
      runCron
    });
    const response = await fetch(`${url}/cron`, {
      method: "POST",
      headers: {
        authorization: "Bearer oidc-token-from-cloud-run",
        "content-type": "application/json",
        "x-cron-secret": "wrong"
      },
      body: JSON.stringify({
        mode: "dry_run"
      })
    });

    expect(response.status).toBe(401);
    expect(runCron).not.toHaveBeenCalled();
  });

  it("passes cron request body to the worker and returns JSON", async () => {
    const runCron = vi.fn(async () => result("success"));
    const { url } = await startServer({
      env: {
        CRON_SECRET: "secret",
        CRON_ALLOW_FORCE: "true"
      },
      runCron
    });
    const response = await fetch(`${url}/cron`, {
      method: "POST",
      headers: {
        authorization: "Bearer secret",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        mode: "send",
        date: "2026-08-01",
        force: true
      })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      result: {
        reportDate: "2026-08-01",
        mode: "send",
        status: "success"
      }
    });
    expect(runCron).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "send",
        reportDate: "2026-08-01",
        force: true
      })
    );
  });

  it("returns non-2xx JSON for duplicate or failed cron runs", async () => {
    const { url } = await startServer({
      runCron: async () => result("failed")
    });
    const response = await fetch(`${url}/cron`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        mode: "send"
      })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      ok: false,
      result: {
        status: "failed",
        errorMessage: "duplicate"
      }
    });
  });

  it("requires CRON_SECRET when the deployment requires cron auth", async () => {
    const { url } = await startServer({
      env: {
        CRON_REQUIRE_SECRET: "true"
      }
    });
    const response = await fetch(`${url}/cron`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{}"
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "CRON_SECRET is required"
    });
  });

  it("rejects oversized cron request bodies", async () => {
    const { url } = await startServer();
    const response = await fetch(`${url}/cron`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ padding: "x".repeat(9000) })
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "Request body too large"
    });
  });

  it("does not expose full cron rows or idempotency keys in HTTP responses", async () => {
    const { url } = await startServer({
      runCron: async () => ({
        ...result("failed"),
        errorMessage: "failed Bearer token secret=https%3A%2F%2Fhooks.slack.com%2Fservices%2FT000%2FB000%2Fsecret"
      })
    });
    const response = await fetch(`${url}/cron`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{}"
    });
    const bodyText = await response.text();

    expect(response.status).toBe(409);
    expect(bodyText).not.toContain("idempotencyKey");
    expect(bodyText).not.toContain("cronRun");
    expect(bodyText).not.toContain("T000");
    expect(bodyText).toContain("Bearer [redacted]");
  });
});

async function startServer(options: { env?: Record<string, string>; runCron?: () => Promise<RunHermesCronResult> } = {}) {
  const server = createCronHttpServer({
    buildInput: (request) =>
      ({
        store: {},
        sources: [],
        reportDate: request.reportDate,
        mode: request.mode,
        force: request.force
      }) as never,
    ...(options.env === undefined ? {} : { env: options.env }),
    ...(options.runCron === undefined ? {} : { runCron: options.runCron as never })
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  openServers.push(server);
  const address = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${address.port}`
  };
}

function result(status: "success" | "failed"): RunHermesCronResult {
  return {
    reportDate: "2026-08-01",
    mode: "send",
    status,
    idempotencyKey: "hermes-cron:daily-digest:2026-08-01",
    cronRun: {
      id: "cron_one",
      idempotencyKey: "hermes-cron:daily-digest:2026-08-01",
      reportDate: "2026-08-01",
      mode: "send",
      status,
      startedAt: "2026-08-01T00:00:00.000Z",
      finishedAt: "2026-08-01T00:00:01.000Z",
      stepName: status === "success" ? "complete" : "failed",
      candidateCount: 1,
      slackAttemptId: null,
      errorMessage: status === "success" ? null : "duplicate"
    },
    candidateCount: 1,
    slackAttempt: null,
    payload: null,
    errorMessage: status === "success" ? null : "duplicate"
  };
}
