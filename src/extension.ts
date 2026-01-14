import * as vscode from "vscode";
import { execFile } from "node:child_process";

let outputChannel: vscode.OutputChannel;

function log(message: string) {
  outputChannel.appendLine(message);
}

function callLuteLint(
  lutePath: string,
  lintArgs: string[],
  document: vscode.TextDocument,
  diagnosticsCollection: vscode.DiagnosticCollection
) {
  const diagnostics: vscode.Diagnostic[] = [];

  const luteProcess = execFile(
    lutePath,
    ["lint", ...lintArgs, "-s", document.getText()],
    (_, stdout, stderr) => {
      log(`Lute stdout: ${stdout}`);
      const violations = JSON.parse(stdout);

      for (const violation of violations) {
        const diagnosticRange = new vscode.Range(
          violation.range.start.line,
          violation.range.start.character,
          violation.range.end.line,
          violation.range.end.character
        );

        const diagnostic = new vscode.Diagnostic(
          diagnosticRange,
          violation.message,
          violation.severity
        );
        diagnostic.code = violation.code;
        diagnostic.source = violation.source;
        diagnostics.push(diagnostic);
      }

      log(`Parsed ${diagnostics.length} diagnostics from Lute.`);

      if (stderr) {
        console.error(`Lute stderr: ${stderr}`);
      }
    }
  );

  luteProcess.on("close", () => {
    log(`Setting ${diagnostics.length} diagnostics for ${document.uri}`);
    diagnosticsCollection.set(document.uri, diagnostics);
  });
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Lute");
  context.subscriptions.push(outputChannel);

  const diagnosticsCollection =
    vscode.languages.createDiagnosticCollection("lute lint");
  context.subscriptions.push(diagnosticsCollection);

  async function lint(document: vscode.TextDocument) {
    if (document.languageId !== "luau" && document.languageId !== "lua") {
      return;
    }

    const lutePath = vscode.workspace
      .getConfiguration("lute")
      .get("execPath", "");
    log(`Lute exec: ${lutePath}`);

    if (lutePath !== "") {
      callLuteLint(lutePath, ["-j"], document, diagnosticsCollection);

      const rulesPath = vscode.workspace
        .getConfiguration("lute")
        .get("lintRules", "");

      if (rulesPath !== "") {
        log(`Using Lute lint rules: ${rulesPath}`);
        callLuteLint(
          lutePath,
          ["-j", "-r", rulesPath],
          document,
          diagnosticsCollection
        );
      }
    }
  }

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(lint));
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor !== undefined) {
        lint(editor.document);
      }
    })
  );
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(lint));

  log("Mandolin activated!");
}

export function deactivate() {}
