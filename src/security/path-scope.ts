import { isAbsolute, relative, resolve } from "node:path";

export const ALLOW_EXTERNAL_PATHS_ENV = "AI_TREND_ALLOW_EXTERNAL_PATHS";

export function resolveProjectPath(
  inputPath: string,
  purpose: string,
  env: Record<string, string | undefined> = process.env
): string {
  const resolvedPath = resolve(inputPath);

  if (env[ALLOW_EXTERNAL_PATHS_ENV] === "true" || process.env[ALLOW_EXTERNAL_PATHS_ENV] === "true") {
    return resolvedPath;
  }

  const projectRoot = resolve(process.cwd());
  const relativePath = relative(projectRoot, resolvedPath);
  if (relativePath.length === 0 || (!relativePath.startsWith("..") && !isAbsolute(relativePath))) {
    return resolvedPath;
  }

  throw new Error(
    `${purpose} must stay inside the project directory. Set ${ALLOW_EXTERNAL_PATHS_ENV}=true only for isolated local tests.`
  );
}

export function assertSafePathSegment(value: string, label: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
    throw new Error(`${label} must contain only letters, numbers, dots, underscores, or hyphens`);
  }
}
