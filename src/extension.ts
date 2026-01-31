import * as vscode from "vscode";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "fs";
import path from "node:path";

import SuggestedFixCodeActionProvider from "./suggestedFixCodeActionProvider";
import { StoredAction, LintViolation, LintResult } from "./types";

const execFilePromise = promisify(execFile);

let outputChannel: vscode.OutputChannel;

function log(message: string) {
  console.log(message);
  outputChannel.appendLine(message);
}

async function callLuteLint(
  lutePath: string,
  lintArgs: string[],
  document: vscode.TextDocument,
  foremanTomlPath?: string
): Promise<LintResult> {
  const diagnostics: vscode.Diagnostic[] = [];
  const suggestedFixes: StoredAction[] = [];

  try {
    const { stdout, stderr } = await execFilePromise(
      lutePath,
      ["lint", ...lintArgs, "-s", document.getText()],
      { cwd: foremanTomlPath }
    );

    const violations = JSON.parse(stdout) as [LintViolation];

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

      diagnostic.code = violation.codeDescription
        ? {
            value: violation.code,
            target: vscode.Uri.parse(violation.codeDescription),
          }
        : violation.code;

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

interface LutePathResult {
  lutePath: string;
  foremanToml: string | null;
}

async function getLutePath(): Promise<LutePathResult | null> {
  let lutePath: string = vscode.workspace
    .getConfiguration("mandolin")
    .get("luteExecPath", "");

  if (lutePath !== "") {
    return { lutePath, foremanToml: null };
  }

  log(
    "Lute exec path is not set. Checking if a Foreman installation is available."
  );

  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    log("No workspace folders available to check for a `foreman.toml` file.");
    return null;
  }

  log("Checking for a `foreman.toml` file in workspace root folder(s).");

  let foremanToml: string | null = null;
  for (const folder of workspaceFolders) {
    const foremanPattern = new vscode.RelativePattern(folder, "foreman.toml");
    const files = await vscode.workspace.findFiles(foremanPattern, null, 1);
    if (files.length > 0) {
      foremanToml = `${folder.uri.fsPath}${path.sep}foreman.toml`;
      break;
    }
  }

  if (foremanToml === null) {
    log("No `foreman.toml` file found in any workspace root folder.");
    return null;
  }

  lutePath =
    process.platform === "win32"
      ? `${process.env.USERPROFILE}/.foreman/bin/lute`
      : `${process.env.HOME}/.foreman/bin/lute`;

  log(
    `Found \`foreman.toml\` in folder: ${foremanToml}. Checking for Lute installation in ${lutePath}.`
  );
  if (!fs.existsSync(lutePath)) {
    log(`Lute not found at expected Foreman path: ${lutePath}.`);
    return null;
  }

  log(`Lute found at expected Foreman path: ${lutePath}.`);

  return { lutePath, foremanToml };
}

export async function activate(context: vscode.ExtensionContext) {
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
        providedCodeActionKinds:
          SuggestedFixCodeActionProvider.providedCodeActionKinds,
      }
    )
  );

  const lutePathResult = await getLutePath();

  if (lutePathResult === null) {
    log("Lute executable path not found. Falling back to bundled Lute.");
  } else if (lutePathResult.foremanToml !== null) {
    const mandolinConfig = vscode.workspace.getConfiguration("mandolin");

    await mandolinConfig.update(
      "luteExecPath",
      lutePathResult.lutePath,
      vscode.ConfigurationTarget.Workspace
    );

    await mandolinConfig.update(
      "foremanTomlPath",
      lutePathResult.foremanToml,
      vscode.ConfigurationTarget.Workspace
    );
  }

  async function lint(document: vscode.TextDocument) {
    console.log(`Linting document: ${document.uri.toString()}`);
    if (document.languageId !== "luau" && document.languageId !== "lua") {
      return;
    }

    const mandolinConfig = vscode.workspace.getConfiguration("mandolin");

    const luteExecConfig = mandolinConfig.get("luteExecPath", "");

    const lutePath: string =
      luteExecConfig === ""
        ? vscode.Uri.joinPath(context.extensionUri, "lute").fsPath
        : luteExecConfig;
    log(`Lute exec: ${lutePath}`);

    const foremanTomlPath: string | undefined =
      mandolinConfig.get("foremanTomlPath");
    log(`foreman.toml: ${foremanTomlPath}`);

    if (lutePath !== undefined) {
      const foremanDirPath = foremanTomlPath
        ? path.dirname(foremanTomlPath)
        : undefined;

      const { diagnostics, suggestedFixes } = await callLuteLint(
        lutePath,
        ["-j"],
        document,
        foremanDirPath
      );

      const rulesPath = vscode.workspace
        .getConfiguration("mandolin")
        .get("lintRules", "");

      if (rulesPath !== "") {
        log(`Using Lute lint rules: ${rulesPath}`);
        const ruleResult = await callLuteLint(
          lutePath,
          ["-j", "-r", rulesPath],
          document,
          foremanDirPath
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
