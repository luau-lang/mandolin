import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";

/**
 * Waits for diagnostics to be generated for a specific file URI.
 * @param uri The URI of the file to monitor.
 * @param timeoutMs Maximum time to wait in milliseconds (default 5000ms).
 */
export function waitForDiagnostics(
  uri: vscode.Uri,
  timeoutMs: number = 5000
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
      reject(
        new Error(
          `Timeout: Diagnostics were not generated for ${uri.fsPath} within ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    const disposable = vscode.languages.onDidChangeDiagnostics(
      (event: vscode.DiagnosticChangeEvent) => {
        if (event.uris.some((u) => u.toString() === uri.toString())) {
          const diagnostics = vscode.languages.getDiagnostics(uri);

          if (diagnostics.length > 0) {
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
    const config = vscode.workspace.getConfiguration("mandolin");
    await config.update(
      "luteExecPath",
      "/Users/skanosue/git/roblox/lute/build/xcode/debug/lute/cli/lute",
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
});
