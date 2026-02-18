import * as assert from "assert";

import * as vscode from "vscode";

import { resolveConfigPath } from "../resolveConfigPath";

suite("resolveConfigPath", () => {
  test("returns absolute paths unchanged", () => {
    const absolutePath = "/opt/shared/lint.config.luau";
    const documentUri = vscode.workspace.workspaceFolders![0].uri;

    const result = resolveConfigPath(absolutePath, documentUri);
    assert.equal(result, absolutePath);
  });

  test("resolves relative paths against the workspace root", () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const documentUri = vscode.workspace.workspaceFolders![0].uri;

    const result = resolveConfigPath("./config/lint.config.luau", documentUri);
    assert.equal(result, `${workspaceRoot}/config/lint.config.luau`);
  });

  test("resolves parent-relative paths against the workspace root", () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const documentUri = vscode.workspace.workspaceFolders![0].uri;
    // e.g. /Users/dev/project -> /Users/dev/shared/lint.config.luau
    const parentDir = workspaceRoot.substring(0, workspaceRoot.lastIndexOf("/"));

    const result = resolveConfigPath("../shared/lint.config.luau", documentUri);
    assert.equal(result, `${parentDir}/shared/lint.config.luau`);
  });

  test("returns relative path as-is when no workspace folder is found", () => {
    const relativePath = "./config/lint.config.luau";
    // Use a URI outside any workspace folder
    const outsideUri = vscode.Uri.file("/tmp/nonexistent/file.luau");

    const result = resolveConfigPath(relativePath, outsideUri);
    assert.equal(result, relativePath);
  });
});
