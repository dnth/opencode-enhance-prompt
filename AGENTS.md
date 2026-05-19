# Agent Notes

## What this repo is

- This is a single-file OpenCode TUI plugin. All runtime logic lives in `index.js`; there is no build system, bundler, TypeScript config, lint config, test runner, or CI workflow.
- `package.json` is part of the plugin contract. Keep `"type": "module"`, `"main": "index.js"`, and the `exports["./tui"]` entry with `config.label`; OpenCode TUI plugin discovery depends on that subpath when `exports` exists.
- The plugin default export must remain an object with `id` and async `tui(api, options)`. Do not add a `server` export or rely on named exports for TUI behavior.

## Commands

- Run `npm run check` after code changes. It is the only configured verification and runs `node --check index.js`.
- For runtime smoke testing without calling a provider, launch OpenCode with `OPENCODE_ENHANCE_MOCK_TEXT='Rewrite this prompt.' opencode` and point `~/.config/opencode/tui.json` at the local checkout.
- There are no dependency installs required for normal development because the package has no dependencies and no lockfile.

## OpenCode and runtime quirks

- User config belongs in `~/.config/opencode/tui.json` or `tui.jsonc`, not repo-local `opencode.json`. File-path plugins are resolved relative to the config file that declares them.
- `index.js` registers `home_prompt` and `session_prompt` slots and tracks prompt refs manually. Be careful around `setPromptRef()` and `getActivePromptRef()`; this is the subtle part of the plugin.
- Enhancement uses a direct OpenAI-compatible HTTP call by default (`OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, default `gpt-5-nano`). `mode: "opencode"` uses `api.client.session.*`, but that path runs through OpenCode's normal agent/session machinery and is slower.
- The default keybind is `<leader>w` (`ctrl+x w` in docs). `pickBinding()` falls back to `<leader>shift+w` if the existing TUI config appears to already use the default binding.
- `OPENCODE_ENHANCE_MOCK_TEXT` bypasses the provider request and writes the mock text directly into the prompt.

## Security and behavior constraints

- Never log prompt contents, provider responses, credentials, or local secret file contents.
- Never commit real credentials, `.env*` files, local secret files, or populated `examples/tui.json` values. Examples must use placeholders only.
- Preserve the core behavior: enhancement rewrites the active prompt in place but never submits it automatically, and the original prompt stays unchanged on failures.
- Keep the plugin dependency-free unless there is a strong safety or compatibility reason; adding a package should be treated as a notable design change.

## Files to avoid

- Leave `.omo/` alone. It is untracked OpenCode continuation/runtime state, not source or project configuration.
