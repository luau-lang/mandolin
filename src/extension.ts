import * as vscode from "vscode";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import SuggestedFixCodeActionProvider, { StoredAction } from "./suggestedFixCodeActionProvider";

const execFilePromise = promisify(execFile);

let outputChannel: vscode.OutputChannel;

function log(message: string) {
  outputChannel.appendLine(message);
}

interface LintResult {
  diagnostics: vscode.Diagnostic[];
  suggestedFixes: StoredAction[];
}

async function callLuteLint(
  lutePath: string,
  lintArgs: string[],
  document: vscode.TextDocument
): Promise<LintResult> {
  const diagnostics: vscode.Diagnostic[] = [];
  const suggestedFixes: StoredAction[] = [];

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
      diagnostics.push(diagnostic);

      if (violation.suggestedfix) {
          const fixRange = new vscode.Range(
            violation.suggestedfix.range.start.line,
            violation.suggestedfix.range.start.character,
            violation.suggestedfix.range.end.line,
            violation.suggestedfix.range.end.character
          );

          const action = new vscode.CodeAction(
            `Fix: ${violation.message}`,
            vscode.CodeActionKind.QuickFix
          );
          action.edit = new vscode.WorkspaceEdit();
          action.edit.replace(document.uri, fixRange, violation.suggestedfix.fix);
          action.isPreferred = true;

          suggestedFixes.push({ action, range: diagnosticRange });
      }
    }

    log(`Parsed ${diagnostics.length} diagnostics from Lute.`);

    if (stderr) {
      console.error(`Lute stderr: ${stderr}`);
    }
  } catch (error) {
    log(`Error calling Lute: ${error}`);
  }

  return { diagnostics, suggestedFixes };
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Mandolin");
  context.subscriptions.push(outputChannel);

  const diagnosticsCollection =
    vscode.languages.createDiagnosticCollection("mandolin");
  context.subscriptions.push(diagnosticsCollection);

  const codeActionProvider = new SuggestedFixCodeActionProvider();

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [{ language: "luau" }, { language: "lua" }],
      codeActionProvider,
      {
        providedCodeActionKinds: SuggestedFixCodeActionProvider.providedCodeActionKinds,
      }
    )
  );

  async function lint(document: vscode.TextDocument) {
    console.log(`Linting document: ${document.uri.toString()}`);
    if (document.languageId !== "luau" && document.languageId !== "lua") {
      return;
    }

    const lutePath = vscode.workspace
      .getConfiguration("mandolin")
      .get("luteExecPath", "");

    log(`Lute exec: ${lutePath}`);

    if (lutePath !== "") {
      const { diagnostics, suggestedFixes } = await callLuteLint(lutePath, ["-j"], document);

      const rulesPath = vscode.workspace
        .getConfiguration("mandolin")
        .get("lintRules", "");

      if (rulesPath !== "") {
        log(`Using Lute lint rules: ${rulesPath}`);
        const ruleResult = await callLuteLint(
          lutePath,
          ["-j", "-r", rulesPath],
          document
        );
        diagnostics.push(...ruleResult.diagnostics);
        suggestedFixes.push(...ruleResult.suggestedFixes);
      }

      log(`Setting ${diagnostics.length} diagnostics for ${document.uri}`);
      diagnosticsCollection.set(document.uri, diagnostics);
      codeActionProvider.updateActions(document.uri, suggestedFixes);
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

  vscode.workspace.textDocuments.forEach(lint);

  log("Mandolin !");
}

export function deactivate() {}
