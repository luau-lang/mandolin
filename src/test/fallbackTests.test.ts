import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";

const vscodeWindow = require("vscode").window;
import sinon from "sinon";

import { waitForDiagnostics } from "./utils";

suite("Fallback suite", () => {
  setup(async () => {
    // Clear settings for fallback tests
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
  });

  test("Foreman fallback", async () => {
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

  test("Bundled lute fallback", async () => {
    const config = vscode.workspace.getConfiguration("mandolin");
    await config.update(
      "luteExecPath",
      "",
      vscode.ConfigurationTarget.Workspace
    );

    // Delete foreman.toml to force bundled lute fallback
    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(
      workspaceFolders && workspaceFolders.length > 0,
      "Expected workspace folder"
    );

    const foremanTomlPath = vscode.Uri.joinPath(
      workspaceFolders[0].uri,
      "foreman.toml"
    );
    let foremanTomlContent: Uint8Array | undefined;

    foremanTomlContent = await vscode.workspace.fs.readFile(foremanTomlPath);
    await vscode.workspace.fs.delete(foremanTomlPath);

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
      outputChannelSpy.calledWith(
        "No `foreman.toml` file found in any workspace root folder."
      )
    );

    assert.ok(
      outputChannelSpy.calledWith(
        "Lute executable path not found. Falling back to bundled Lute."
      )
    );

    // Restore foreman.toml
    await vscode.workspace.fs.writeFile(foremanTomlPath, foremanTomlContent);

    sinon.restore();
  });
});
