import * as vscode from "vscode";

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
