import * as vscode from "vscode";

interface SuggestedFix {
  fix: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface ActionableViolation {
  message: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  suggestedfix: SuggestedFix;
}

interface StoredAction {
  action: vscode.CodeAction;
  range: vscode.Range;
}

export class SuggestedFixCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  private actionsMap = new Map<string, StoredAction[]>();

  /**
   * Update the code actions for a document based on actionable violations from linting.
   */
  updateActions(uri: vscode.Uri, actionableViolations: ActionableViolation[]): void {
    const storedActions: StoredAction[] = [];

    for (const violation of actionableViolations) {
      const diagnosticRange = new vscode.Range(
        violation.range.start.line,
        violation.range.start.character,
        violation.range.end.line,
        violation.range.end.character
      );

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
      action.edit.replace(uri, fixRange, violation.suggestedfix.fix);
      action.isPreferred = true;

      storedActions.push({ action, range: diagnosticRange });
    }

    this.actionsMap.set(uri.toString(), storedActions);
  }

  /**
   * Clear code actions for a document.
   */
  clearActions(uri: vscode.Uri): void {
    this.actionsMap.delete(uri.toString());
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const storedActions = this.actionsMap.get(document.uri.toString());
    if (!storedActions) return [];

    // Return actions whose diagnostic range intersects with the requested range
    return storedActions.flatMap((stored) =>
      stored.range.intersection(range) ? [stored.action] : []
    );
  }
}

export default SuggestedFixCodeActionProvider;
