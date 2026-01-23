import * as vscode from "vscode";

export interface StoredAction {
  action: vscode.CodeAction;
  range: vscode.Range;
}

export interface LintResult {
  diagnostics: vscode.Diagnostic[];
  suggestedFixes: StoredAction[];
}

export interface Position {
  line: number,
  character: number
}

export interface LintRange {
  start: Position,
  end: Position
}

export interface LintViolation {
  range: LintRange,
  severity: number,
  code: string,
  codeDescription?: string,
  source: "lute lint",
  message: string,
  tags?: [ number ],
  suggestedfix?: {
    fix: string,
    range: LintRange
  }
}