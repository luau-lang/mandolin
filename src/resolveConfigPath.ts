import * as vscode from "vscode";
import path from "node:path";

export function resolveConfigPath(
  configPath: string,
  documentUri: vscode.Uri
): string {
  if (path.isAbsolute(configPath)) {
    return configPath;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
  if (workspaceFolder) {
    return path.resolve(workspaceFolder.uri.fsPath, configPath);
  }

  return configPath;
}
