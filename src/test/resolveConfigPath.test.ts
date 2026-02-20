import * as assert from "assert";
import * as path from "path";

import * as vscode from "vscode";

import { resolveConfigPath } from "../resolveConfigPath";

suite("resolveConfigPath", () => {
  const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;

  test("returns absolute paths unchanged", () => {
    const absolutePath = "/opt/shared/lint.config.luau";

    const result = resolveConfigPath(absolutePath, workspaceRoot);
    assert.equal(result, absolutePath);
  });

  test("resolves relative paths against the workspace root", () => {
    const result = resolveConfigPath(
      "./config/lint.config.luau",
      workspaceRoot
    );
    assert.equal(
      result,
      path.join(workspaceRoot, "config", "lint.config.luau")
    );
  });

  test("resolves parent-relative paths against the workspace root", () => {
    const parentDir = path.dirname(workspaceRoot);

    const result = resolveConfigPath(
      "../shared/lint.config.luau",
      workspaceRoot
    );
    assert.equal(result, path.join(parentDir, "shared", "lint.config.luau"));
  });

  test("returns relative path as-is when no workspace root is available", () => {
    const relativePath = "./config/lint.config.luau";

    const result = resolveConfigPath(relativePath, undefined);
    assert.equal(result, relativePath);
  });
});
