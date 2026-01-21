import * as vscode from "vscode";

interface SuggestedFix {
  fix: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface StoredAction {
  action: vscode.CodeAction;
  range: vscode.Range;
}

export class SuggestedFixCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  private actionsMap = new Map<vscode.Uri, StoredAction[]>();

  /**
   * Update the code actions for a document based on actionable violations from linting.
   */
  updateActions(uri: vscode.Uri, storedActions: StoredAction[]): void {
    this.actionsMap.set(uri, storedActions);
  }

  /**
   * Clear code actions for a document.
   */
  clearActions(uri: vscode.Uri): void {
    this.actionsMap.delete(uri);
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const storedActions = this.actionsMap.get(document.uri);
    if (!storedActions) return [];

    // Return actions whose diagnostic range intersects with the requested range
    return storedActions.flatMap((stored) =>
      stored.range.intersection(range) ? [stored.action] : []
    );
  }
}

export default SuggestedFixCodeActionProvider;
