# Mandolin

Mandolin is designed to consume developer tooling related features of [Lute](https://github.com/luau-lang/lute), the Roblox-independent Luau runtime.

## Features

Mandolin surfaces lint violations reported by `lute lint`, and supports specifying custom lint rules on a per-project basis.

## Requirements

- A `lute` binary. You can either [download a recent release](https://github.com/luau-lang/lute/releases) or build `lute` locally. Then, update Mandolin's "Lute Exec Path" setting to point to this binary.

## Extension Settings

This extension contributes the following settings:

- `mandolin.luteExecPath`: A path pointing to the `lute` binary to use to generate lint warnings.
- `mandolin.lintRules`: A path pointing to a folder containing lint rules to use in addition to the default ones provided by `lute`.

## Development

To work on Mandolin, you'll need [Node.js](https://nodejs.org/en) and [Foreman](https://github.com/Roblox/foreman).
To install dependencies, run `npm install` and `foreman install` (assuming you have aliased or placed `npm` and `foreman` on your PATH as appropriate).
`.vscode/extensions.json` lists a number of recommended VSCode extensions, which will let you do a number of useful things like running and debugging the extension and its tests.

### Testing

You can run tests using `npm run test` or by using the Extension Test Runner extension.
To add tests, you can either define a new suite or extend an existing one in `src/test`.
The existing test suites make use of a dummy workspace located at `src/test/sampleWorkspace`.
If you define a new test suite, you'll need to extend the configuration defined in `.vscode-test.mjs`.

**Enjoy!**
