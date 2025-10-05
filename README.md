# Afterburner CLI

## Disclaimer

This is an unofficial CLI tool and is not affiliated with,
endorsed, or sponsored by GitHub, Microsoft, or their affiliates. It is provided
"as-is" without any warranty. Use at your own discretion and risk.

## Credits

This tool is a fork of [tweakcc](https://github.com/Piebald-AI/tweakcc) by
Piebald-AI. Much of the foundational work and inspiration comes from their
original project. Sincere thanks to Piebald-AI for their contributions to the
community.

## Overview

Afterburner is a command-line tool that extends the GitHub Copilot CLI to allow
selection of all available models returned from the Copilot API (except for
OpenAI o4-mini and GPT-5 Codex). It works by applying AST-level patches to the
Copilot CLI installation, enabling dynamic model loading from environment
variables, configuration files, and server responses.

## Quickstart

Run Afterburner without installation using npx, bunx, or your preferred package
runner:

```bash
npx @afterburner/cli --apply

# Or with bun:
bunx @afterburner/cli --apply

# Or with pnpm:
pnpm dlx @afterburner/cli --apply
```

To install globally:

```bash
npm install -g @afterburner/cli

# Then run:
afterburner --apply
```

## Features

The patches are applied at the Abstract Syntax Tree level using structural
pattern matching, making them identifier-agnostic and robust across different
CLI versions. When you update GitHub Copilot CLI, simply rerun Afterburner to
reapply the patches.

## How It Works

Afterburner modifies the minified GitHub Copilot CLI bundle by parsing it into
an Abstract Syntax Tree, applying targeted patches to specific code structures,
and regenerating the modified code. The patcher uses meriyah for parsing,
and astring for code generation.

## Usage

Basic usage to apply patches to your GitHub Copilot CLI installation:

```bash
afterburner --apply
```

Debug mode with verbose output:

```bash
afterburner --debug --apply
```

After patching, add custom models via environment variable:

```bash
export COPILOT_MODEL=custom-model-id
copilot
```

Or add models to your config file at `~/.copilot/config.json`:

```json
{
  "model": "custom-model-id"
}
```

## Verified Compatibility

Afterburner is tested and verified to work with GitHub Copilot CLI versions
0.0.333 and 0.0.334. The structural pattern matching approach may not provide
compatibility with other versions though, though testing is recommended and pull
requests are welcome for fixes.

## Development

Clone and build from source:

```bash
git clone https://github.com/DanielNappa/afterburner-cli.git
cd afterburner
npm install
npm run build
node dist/index.js --apply
```

Run in development mode with bun:

```bash
bun dev --debug --apply
```

## Technical Details

The patcher implementation is located in `src/utils/patches/modelExtensions.ts`
and uses TypeScript with proper ESTree type annotations. All code follows strict
type checking with no any or unknown types allowed. The patches are applied
purely through AST manipulation without string-based code modifications.

For development and testing, you can generate astring-formatted reference files
from your local CLI installation:

```bash
node -e "const fs=require('fs'),{parse}=require('meriyah'),{generate}=require('astring');const code=fs.readFileSync('node_modules/@github/copilot/index.js','utf-8');const ast=parse(code,{module:true,next:true});fs.writeFileSync('index-astring.js',generate(ast),'utf-8');"
```

These formatted files help with AST exploration during development but are not
required for the patcher to function.

## Troubleshooting

If patches fail to apply, ensure your GitHub Copilot CLI installation is at a
supported version. Run with the `--debug` flag to see detailed patch application
logs. If your CLI installation is in a non-standard location, the patcher may
fail to locate it.

When updating GitHub Copilot CLI to a new version, your patches will be
overwritten. Simply rerun Afterburner to reapply them, although it is not guaranteed to work for newer versions.

## License

This project is licensed under the [MIT License](LICENSE).
