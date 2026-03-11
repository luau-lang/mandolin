import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";

const vscodeWindow = require("vscode").window;
import sinon from "sinon";

import { waitForDiagnostics } from "./utils";

suite("Bundled fallback suite", () => {
  let outputChannelSpy: sinon.SinonSpy;
  let config: vscode.WorkspaceConfiguration;

  const resetMandolinConfig = async () => {
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
  };

  suiteSetup(() => {
    outputChannelSpy = sinon.spy();
    config = vscode.workspace.getConfiguration("mandolin");
    sinon.stub(vscodeWindow, "createOutputChannel").returns({
      appendLine: outputChannelSpy,
      dispose: () => undefined,
    });
  });

  setup(async () => {
    outputChannelSpy.resetHistory();
    await resetMandolinConfig();
  });

  teardown(async () => {
    await resetMandolinConfig();
  });

  suiteTeardown(() => {
    sinon.restore();
  });

  test("Bundled lute fallback", async () => {
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
  });

  test("luteExecPath specifies foreman lute, foremanTomlPath points to foreman.toml without lute (invalid lute binary path)", async () => {
    const foremanLutePath =
      process.platform === "win32"
        ? `${process.env.HOME}\\.foreman\\bin\\lute.exe`
        : `${process.env.HOME}/.foreman/bin/lute`;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mandolin-test-"));
    // Create a temporary foreman.toml that does NOT declare lute
    const tmpForemanToml = path.join(tmpDir, "foreman.toml");
    fs.writeFileSync(
      tmpForemanToml,
      "[tools]\n# lute is intentionally absent\n"
    );

    await config.update(
      "luteExecPath",
      foremanLutePath,
      vscode.ConfigurationTarget.Workspace
    );
    await config.update(
      "foremanTomlPath",
      tmpForemanToml,
      vscode.ConfigurationTarget.Workspace
    );

    const document = await vscode.workspace.openTextDocument({
      language: "luau",
      content: `local x = 3 / 0`,
    });
    await vscode.window.showTextDocument(document);

    const diagnostics = await waitForDiagnostics(document.uri);
    assert.ok(diagnostics.length > 0, "Expected diagnostics to be generated");

    assert.ok(
      outputChannelSpy.calledWithMatch(
        `Lute validation failed for ${foremanLutePath}`
      ),
      "Expected validation failure log for foreman lute binary"
    );

    assert.ok(
      outputChannelSpy.calledWithMatch(
        `Warning: Lute at ${foremanLutePath} failed to execute from ${path.dirname(foremanLutePath)}. Falling back to bundled Lute.`
      ),
      "Expected fallback warning log"
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
