import * as vscode from "vscode";

interface SuggestedFix {
  fix: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

interface DiagnosticData {
  suggestedfix?: SuggestedFix;
}

// Augment vscode.Diagnostic to include the 'data' property (exists at runtime per LSP spec)
declare module "vscode" {
  interface Diagnostic {
    data?: DiagnosticData;
  }
}

export class SuggestedFixCodeActionProvider
  implements vscode.CodeActionProvider
{
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.data?.suggestedfix) {
        const action = this.createFixAction(
          document,
          diagnostic,
          diagnostic.data.suggestedfix,
        );
        actions.push(action);
      }
    }

    return actions;
  }

  private createFixAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    suggestedfix: SuggestedFix,
  ): vscode.CodeAction {
    // Use the suggestedfix location if provided, otherwise fall back to diagnostic range
    const fixRange = suggestedfix.range
      ? new vscode.Range(
          suggestedfix.range.start.line,
          suggestedfix.range.start.character,
          suggestedfix.range.end.line,
          suggestedfix.range.end.character,
        )
      : diagnostic.range;

    const action = new vscode.CodeAction(
      `Fix: ${diagnostic.message}`,
      vscode.CodeActionKind.QuickFix,
    );

    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, fixRange, suggestedfix.fix);

    // Associate this action with the diagnostic
    action.diagnostics = [diagnostic];

    // Mark as preferred (shows in lightbulb menu as default)
    action.isPreferred = true;

    return action;
  }
}

export default SuggestedFixCodeActionProvider;
