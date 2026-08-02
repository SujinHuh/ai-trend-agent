import { readFileSync, statSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Task 006 deployment assets", () => {
  it("builds the production worker from compiled JavaScript", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(packageJson.scripts.build).toBe("tsc -p tsconfig.build.json");
    expect(packageJson.scripts["start:cron:serve"]).toBe("node dist/src/cli.js cron:serve");
    expect(dockerfile).toContain("npm run build");
    expect(dockerfile).toContain("apt-get install -y --no-install-recommends python3 make g++");
    expect(dockerfile).toContain('CMD ["npm", "run", "start:cron:serve", "--", "--port=8080"]');
    expect(dockerfile).toContain("USER app");
  });

  it("keeps sensitive and local-only paths out of the Docker context", () => {
    const dockerignore = readFileSync(".dockerignore", "utf8").split(/\r?\n/);

    expect(dockerignore).toEqual(
      expect.arrayContaining([
        ".env",
        ".env.*",
        ".agents/",
        ".git/",
        ".cache/",
        "data/",
        "docs/showcase/",
        "node_modules/",
        "tests/"
      ])
    );
  });

  it("deploy script uses private Cloud Run, Secret Manager, and split service accounts", () => {
    const script = readFileSync("scripts/cloud-run/deploy-worker.sh", "utf8");

    expect(script).toContain("--no-allow-unauthenticated");
    expect(script).toContain("--set-secrets=");
    expect(script).toContain("SLACK_WEBHOOK_URL=");
    expect(script).toContain("CRON_SECRET=");
    expect(script).toContain("artifacts repositories create");
    expect(script).toContain("roles/artifactregistry.writer");
    expect(script).toContain("roles/logging.logWriter");
    expect(script).toContain("-docker.pkg.dev");
    expect(script).toContain("roles/secretmanager.secretAccessor");
    expect(script).toContain("roles/run.invoker");
    expect(script).toContain("NODE_ENV=production,CRON_REQUIRE_SECRET=true");
    expect(script).not.toContain("roles/editor");
    expect(script).not.toContain("roles/owner");
  });

  it("scheduler script uses 07:00 KST, OIDC, POST /cron, and explicit send mode", () => {
    const script = readFileSync("scripts/cloud-run/create-scheduler-job.sh", "utf8");

    expect(script).toContain('SCHEDULE="${SCHEDULE:-0 7 * * *}"');
    expect(script).toContain('TIME_ZONE="${TIME_ZONE:-Asia/Seoul}"');
    expect(script).toContain('--http-method=POST');
    expect(script).toContain('--message-body=\'{"mode":"send"}\'');
    expect(script).toContain("--oidc-service-account-email=");
    expect(script).toContain("--oidc-token-audience=");
    expect(script).toContain("X-Cron-Secret=");
    expect(script).toContain("secrets versions access latest");
    expect(script).toContain(">/dev/null");
    expect(script).not.toContain("echo ${CRON_SECRET_VALUE}");
  });

  it("smoke script checks auth and response minimization without printing secrets", () => {
    const script = readFileSync("scripts/cloud-run/validate-deployment-smoke.sh", "utf8");

    expect(script).toContain("CRON_SECRET_VALUE or GCP_PROJECT_ID is required; the secret will be used but not printed");
    expect(script).toContain("secrets versions access latest");
    expect(script).toContain("ID_TOKEN");
    expect(script).toContain("REQUIRE_DIRECT_AUTH_SMOKE");
    expect(script).toContain("X-Cron-Secret:");
    expect(script).toContain("Expected unauthenticated /cron request to return 401 or 403");
    expect(script).toContain("ID_TOKEN is required when REQUIRE_DIRECT_AUTH_SMOKE=true");
    expect(script).toContain("do not use CRON_SECRET as a bearer token");
    expect(script).toContain("Use Cloud Scheduler manual run to validate the OIDC invoker path");
    expect(script).toContain("cronRun|idempotencyKey|hooks\\.slack\\.com|Bearer");
    expect(script).not.toContain("echo ${CRON_SECRET_VALUE}");
    expect(script).not.toContain('Authorization: Bearer ${CRON_SECRET_VALUE}');
  });

  it("cloud-run scripts are executable", () => {
    for (const path of [
      "scripts/cloud-run/setup-secrets.sh",
      "scripts/cloud-run/deploy-worker.sh",
      "scripts/cloud-run/create-scheduler-job.sh",
      "scripts/cloud-run/validate-deployment-smoke.sh"
    ]) {
      expect(statSync(path).mode & 0o111).toBeGreaterThan(0);
    }
  });
});
