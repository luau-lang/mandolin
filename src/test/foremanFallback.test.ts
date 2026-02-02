import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";

const vscodeWindow = require("vscode").window;
import sinon from "sinon";

import { waitForDiagnostics } from "./utils";

suite("Foreman fallback suite", () => {
  test("Foreman fallback", async () => {
    // Clear settings
    const config = vscode.workspace.getConfiguration("mandolin");
    await config.update(
      "luteExecPath",
      undefined,
      vscode.ConfigurationTarget.Workspace
    );
    await config.update(
      "foremanTomlPath",
      undefined,
      vscode.ConfigurationTarget.Workspace
    );

    const outputChannelSpy = sinon.spy();
    sinon
      .stub(vscodeWindow, "createOutputChannel")
      .returns({ appendLine: outputChannelSpy });

    const document = await vscode.workspace.openTextDocument({
      language: "luau",
      content: `local x = 3 / 0`,
    });

    const diagnostics = await waitForDiagnostics(document.uri);
    assert.ok(diagnostics.length > 0, "Expected diagnostics to be generated");

    assert.ok(
      outputChannelSpy.calledWith(
        "Lute exec path is not set. Checking if a Foreman installation is available."
      )
    );
    assert.ok(
      outputChannelSpy.calledWith(
        "Checking for a `foreman.toml` file in workspace root folder(s)."
      )
    );
    assert.ok(
      outputChannelSpy.calledWithMatch("Found `foreman.toml` in folder:")
    );
    assert.ok(
      outputChannelSpy.calledWithMatch("Checking for Lute installation in ")
    );

    sinon.restore();
  });
});
