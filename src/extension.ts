import * as vscode from "vscode";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import SuggestedFixCodeActionProvider from "./suggestedFixCodeActionProvider";

const execFilePromise = promisify(execFile);

let outputChannel: vscode.OutputChannel;

function log(message: string) {
  outputChannel.appendLine(message);
}

async function callLuteLint(
  lutePath: string,
  lintArgs: string[],
  document: vscode.TextDocument
): Promise<vscode.Diagnostic[]> {
  const diagnostics: vscode.Diagnostic[] = [];

  try {
    const { stdout, stderr } = await execFilePromise(lutePath, [
      "lint",
      ...lintArgs,
      "-s",
      document.getText(),
    ]);

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

      if (violation.suggestedfix) {
        diagnostic.data = {
          suggestedfix: violation.suggestedfix
        };
      }
      diagnostics.push(diagnostic);
    }

    log(`Parsed ${diagnostics.length} diagnostics from Lute.`);

    if (stderr) {
      console.error(`Lute stderr: ${stderr}`);
    }
  } catch (error) {
    log(`Error calling Lute: ${error}`);
  }

  return diagnostics;
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Mandolin");
  context.subscriptions.push(outputChannel);

  const diagnosticsCollection =
    vscode.languages.createDiagnosticCollection("lute lint");
  context.subscriptions.push(diagnosticsCollection);

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [{ language: "luau" }, { language: "lua" }],
      new SuggestedFixCodeActionProvider(),
      {
        providedCodeActionKinds: SuggestedFixCodeActionProvider.providedCodeActionKinds,
      }
    )
  );

  async function lint(document: vscode.TextDocument) {
    if (document.languageId !== "luau" && document.languageId !== "lua") {
      return;
    }

    const lutePath = vscode.workspace
      .getConfiguration("mandolin")
      .get("luteExecPath", "");

    log(`Lute exec: ${lutePath}`);

    if (lutePath !== "") {
      const diagnostics = await callLuteLint(lutePath, ["-j"], document);

      const rulesPath = vscode.workspace
        .getConfiguration("mandolin")
        .get("lintRules", "");

      if (rulesPath !== "") {
        log(`Using Lute lint rules: ${rulesPath}`);
        const ruleDiagnostics = await callLuteLint(
          lutePath,
          ["-j", "-r", rulesPath],
          document
        );
        diagnostics.push(...ruleDiagnostics);
      }

      log(`Setting ${diagnostics.length} diagnostics for ${document.uri}`);
      diagnosticsCollection.set(document.uri, diagnostics);
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
