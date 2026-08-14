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

/**
 * Waits for a specific Debug Adapter Protocol event (e.g. "stopped") to be sent
 * by the debug adapter for the given debug type.
 * @param debugType The `type` of the debug session to observe (e.g. "lute").
 * @param eventName The DAP event name to wait for (e.g. "stopped").
 * @param timeoutMs Maximum time to wait in milliseconds (default 30000ms).
 */
export function waitForDebugAdapterEvent(
  debugType: string,
  eventName: string,
  timeoutMs: number = 30000
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      trackerDisposable.dispose();
      reject(
        new Error(
          `Timeout: DAP event "${eventName}" was not received within ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    const trackerDisposable = vscode.debug.registerDebugAdapterTrackerFactory(
      debugType,
      {
        createDebugAdapterTracker() {
          return {
            onDidSendMessage(message) {
              if (message.type === "event" && message.event === eventName) {
                clearTimeout(timer);
                trackerDisposable.dispose();
                resolve(message);
              }
            },
          };
        },
      }
    );
  });
}
