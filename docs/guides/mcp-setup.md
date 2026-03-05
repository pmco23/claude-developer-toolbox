# Repomix Setup

Repomix is used by `/pack` and `/qa` for token-efficient codebase snapshots. It runs as a CLI tool — no MCP server required.

## Install

```bash
npm install -g repomix
```

## Verify

```bash
repomix --version
```

## Troubleshooting — repomix not found

If Repomix was installed via nvm, the `repomix` binary may not be on PATH in non-interactive shells. Fix by linking it globally:

```bash
# Find the path
which repomix

# Option 1: Add nvm's bin to your PATH in ~/.zshrc or ~/.bashrc
# Option 2: Create a symlink
sudo ln -s $(which repomix) /usr/local/bin/repomix
```

The plugin checks for `repomix` on PATH at session start and warns if missing. `/pack` will block with an explicit error if repomix is not installed.
