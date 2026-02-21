import path from "node:path";

export function resolveConfigPath(
  configPath: string,
  workspaceRoot?: string
): string {
  if (path.isAbsolute(configPath)) {
    return configPath;
  }

  if (workspaceRoot) {
    return path.resolve(workspaceRoot, configPath);
  }

  return configPath;
}
