import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";

const vscodeWindow = require("vscode").window;
import sinon from "sinon";

import which from "which";

/**
 * Waits for diagnostics to be generated for a specific file URI.
 * @param uri The URI of the file to monitor.
 * @param timeoutMs Maximum time to wait in milliseconds (default 30000ms).
 */
export function waitForDiagnostics(
  uri: vscode.Uri,
  timeoutMs: number = 30000
): Promise<vscode.Diagnostic[]> {
  return new Promise((resolve, reject) => {
    // Check if diagnostics are already present
    const currentDiagnostics = vscode.languages.getDiagnostics(uri);
    if (currentDiagnostics.length > 0) {
      resolve(currentDiagnostics);
      return;
    }

    // Set up the timeout
    const timer = setTimeout(() => {
      disposable.dispose();
      console.log(
        `Timeout waiting for diagnostics for ${uri.fsPath}. There were diagnostics for ${vscode.languages.getDiagnostics().length} entries.`
      );
      reject(
        new Error(
          `Timeout: Diagnostics were not generated for ${uri.fsPath} within ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    const startTime = Date.now();

    const disposable = vscode.languages.onDidChangeDiagnostics(
      (event: vscode.DiagnosticChangeEvent) => {
        if (event.uris.some((u) => u.toString() === uri.toString())) {
          const diagnostics = vscode.languages.getDiagnostics(uri);

          if (diagnostics.length > 0) {
            const elapsedMs = Date.now() - startTime;
            console.log(
              `Diagnostics received in ${elapsedMs}ms for ${uri.fsPath}`
            );
            clearTimeout(timer);
            disposable.dispose();
            resolve(diagnostics);
          }
        }
      }
    );
  });
}

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

  test("Foreman fallback", async () => {
    const config = vscode.workspace.getConfiguration("mandolin");
    const lutePath = config.get("luteExecPath", "");
    await config.update(
      "luteExecPath",
      "",
      vscode.ConfigurationTarget.Workspace
    );

    const outputChannelSpy = sinon.spy();
    sinon
      .stub(vscodeWindow, "createOutputChannel")
      .returns({ appendLine: outputChannelSpy });

    const document = await vscode.workspace.openTextDocument({
      language: "luau",
      content: `local x = 3 / 0`,
    });

    const diagnostics = await waitForDiagnostics(document.uri);
    assert.ok(diagnostics.length > 0, "Expected diagnostics to be generated");

    assert.ok(
      outputChannelSpy.calledWith(
        "Lute exec path is not set. Checking if a Foreman installation is available."
      )
    );
    assert.ok(
      outputChannelSpy.calledWith(
        "Checking for a `foreman.toml` file in workspace root folder(s)."
      )
    );
    assert.ok(
      outputChannelSpy.calledWithMatch("Found `foreman.toml` in folder:")
    );
    assert.ok(
      outputChannelSpy.calledWithMatch(
        "Checking for Lute installation in `~/.foreman/bin`."
      )
    );

    await config.update(
      "luteExecPath",
      lutePath,
      vscode.ConfigurationTarget.Workspace
    );
    sinon.restore();
  });

  // test("Bundled lute fallback", async () => {
  //   const config = vscode.workspace.getConfiguration("mandolin");
  //   await config.update(
  //     "luteExecPath",
  //     "",
  //     vscode.ConfigurationTarget.Workspace
  //   );

  //   // Delete foreman.toml to force bundled lute fallback
  //   const workspaceFolders = vscode.workspace.workspaceFolders;
  //   assert.ok(
  //     workspaceFolders && workspaceFolders.length > 0,
  //     "Expected workspace folder"
  //   );

  //   const foremanTomlPath = vscode.Uri.joinPath(
  //     workspaceFolders[0].uri,
  //     "foreman.toml"
  //   );
  //   let foremanTomlContent: Uint8Array | undefined;

  //   foremanTomlContent = await vscode.workspace.fs.readFile(foremanTomlPath);
  //   await vscode.workspace.fs.delete(foremanTomlPath);

  //   const outputChannelSpy = sinon.spy();
  //   sinon
  //     .stub(vscodeWindow, "createOutputChannel")
  //     .returns({ appendLine: outputChannelSpy });

  //   const document = await vscode.workspace.openTextDocument({
  //     language: "luau",
  //     content: `local x = 3 / 0`,
  //   });

  //   const diagnostics = await waitForDiagnostics(document.uri);
  //   assert.ok(diagnostics.length > 0, "Expected diagnostics to be generated");

  //   assert.ok(
  //     outputChannelSpy.calledWith(
  //       "Lute exec path is not set. Checking if a Foreman installation is available."
  //     )
  //   );
  //   assert.ok(
  //     outputChannelSpy.calledWith(
  //       "Checking for a `foreman.toml` file in workspace root folder(s)."
  //     )
  //   );
  //   assert.ok(
  //     outputChannelSpy.calledWith(
  //       "No `foreman.toml` file found in any workspace root folder."
  //     )
  //   );

  //   assert.ok(
  //     outputChannelSpy.calledWith(
  //       "Lute executable path not found. Falling back to bundled Lute."
  //     )
  //   );

  //   // Restore foreman.toml
  //   await vscode.workspace.fs.writeFile(foremanTomlPath, foremanTomlContent);

  //   sinon.restore();
  // });

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
});
