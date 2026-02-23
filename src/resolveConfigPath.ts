import path from "node:path";

export function resolveConfigPath(
  configPath: string,
  workspaceRoot?: string
): string {
  // explicitly handle ${workspaceFolder}
  if (
    configPath.includes("${workspaceFolder}") &&
    workspaceRoot !== undefined
  ) {    
    configPath = configPath.replace("${workspaceFolder}", workspaceRoot);
  }

  if (path.isAbsolute(configPath)) {
    return configPath;
  }

  if (workspaceRoot) {
    return path.resolve(workspaceRoot, configPath);
  }

  return configPath;
}
