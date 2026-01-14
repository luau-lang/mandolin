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

**Enjoy!**
