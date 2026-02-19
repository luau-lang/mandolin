import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";

import which from "which";

import { waitForDiagnostics } from "./utils";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  suiteSetup(async () => {
    const lutePath = await which("lute");
    console.log(`Setting luteExecPath to ${lutePath} for tests.`);
    const config = vscode.workspace.getConfiguration("mandolin");
    await config.update(
      "luteExecPath",
      lutePath,
      vscode.ConfigurationTarget.Workspace
    );
  });

  test("Sanity", async () => {
    const document = await vscode.workspace.openTextDocument({
      language: "luau",
      content: `local x = 3 / 0`,
    });

    const diagnostics = await waitForDiagnostics(document.uri);
    assert.ok(diagnostics.length > 0, "Expected diagnostics to be generated");
  });

  test("Code actions are provided for diagnostics with suggested fixes", async () => {
    const document = await vscode.workspace.openTextDocument({
      language: "luau",
      content: `a = b
  b = a`, // should trigger almost_swapped with suggested fix
    });
    await vscode.window.showTextDocument(document);

    const diagnostics = await waitForDiagnostics(document.uri);
    assert.ok(diagnostics.length > 0, "Expected diagnostics to be generated");

    const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
      "vscode.executeCodeActionProvider",
      document.uri,
      diagnostics[0].range
    );

    const quickFix = actions?.find((a) =>
      a.kind?.contains(vscode.CodeActionKind.QuickFix)
    );
    assert.ok(quickFix);
    assert.ok(quickFix.edit);

    const applied = await vscode.workspace.applyEdit(quickFix.edit!);
    assert.ok(applied, "Expected edit to be applied successfully");

    const newContent = document.getText();
    assert.equal(newContent, "a, b = b, a");
  });

  test("Tags are parsed for diagnostics with tags", async () => {
    const document = await vscode.workspace.openTextDocument({
      language: "luau",
      content: `local x = 0`, // should trigger unused_variable
    });
    await vscode.window.showTextDocument(document);

    const diagnostics = await waitForDiagnostics(document.uri);
    assert.ok(diagnostics.length > 0, "Expected diagnostics to be generated");

    assert.notEqual(
      diagnostics[0].tags,
      undefined,
      "Expected diagnostic to have tags"
    );

    const tags = diagnostics[0].tags!;

    assert.equal(tags.length, 1, "Expected diagnostic to have exactly one tag");

    assert.equal(
      tags[0],
      vscode.DiagnosticTag.Unnecessary,
      "Expected tag to be Unnecessary"
    );
  });
});
