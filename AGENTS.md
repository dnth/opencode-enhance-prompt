# Agent Notes

## What this repo is

- A single-file OpenCode TUI plugin. All runtime logic lives in `index.js`; no build system, bundler, TypeScript config, lint config, test runner, or CI workflow.
- `package.json` is part of the plugin contract. Keep `"type": "module"`, `"main": "index.js"`, and the `exports["./tui"]` entry with `config.label`; OpenCode TUI plugin discovery depends on that subpath when `exports` exists.
- The default export must remain an object with `id` and async `tui(api, options)`. Do not add a `server` export or rely on named exports for TUI behavior.
- No runtime dependencies, no lockfile. Adding a dependency is a notable design change.

## Commands

- **Verification**: `npm run check` runs `node --check index.js` (syntax-only, no typechecker).
- **Smoke testing** (no provider call): `OPENCODE_ENHANCE_MOCK_TEXT='Rewrite this prompt.' opencode` with `~/.config/opencode/tui.json` pointing at the local checkout.

## Prompt enhancement behavior

- Enhancement rewrites the active prompt in place, never submits automatically. On any failure, the original prompt stays unchanged.
- **Iteration**: Running `Enhance prompt` again on an already-enhanced prompt uses `ITERATION_SYSTEM_PROMPT` (produces a fresh alternative variation, not a minor edit). Detection is based on whether `enhanceHistory` already has an entry for that prompt ref.
- **Undo**: `<leader>z` (`ctrl+x z`) restores the pre-enhancement text. History is capped at 10 entries (shifts oldest first). If the prompt reference expired or the TUI config changed, undo emits a toast error and clears history.
- **Concurrency guard**: Only one enhancement runs at a time. The `enhancing` boolean prevents overlapping requests; additional invocations during a run get an `"info"` toast.
- **Toast messages**: `"No active prompt found"`, `"Type a prompt first"`, `"Prompt enhancement already running"`, `"Enhancing prompt..."`, `"Prompt enhanced"`, provider error or timeout text, `"Nothing to undo"`, `"Reverted to original prompt"`.

## Plugin internals (things agents commonly miss)

- **Prompt ref tracking**: The plugin registers `home_prompt` and `session_prompt` slots via `api.slots.register()`. It tracks refs in a `promptRefs` map (`{ home, session }`) and `activePromptRef`. `getActivePromptRef()` prefers the focused ref, falling back to `activePromptRef`. If the prompt slots don't render (e.g., custom TUI layout), the plugin cannot find prompt text.
- **setPromptInput(ref, text)**: Sets `input` and clears `parts` on the ref. This is how enhanced text reaches the prompt box.
- **`pickBinding()`**: Checks existing TUI keybinds for `<leader>w`. If found (even partially matched via `bindingMatches()`), it falls back to `<leader>shift+w`.

## Direct provider mode (default)

- Calls an OpenAI-compatible `/chat/completions` endpoint via `fetch` with an `AbortController` timeout (default 30s).
- Sends `max_completion_tokens`, and conditionally `reasoning_effort` and `verbosity` only when the model name matches `/^gpt-5(?:[.-]|$)/i` (detected by `isGPT5Model()`).
- **Model resolution priority**: `options.directModel` > `OPENAI_ENHANCE_MODEL` env > `options.model` > `"gpt-5-nano"`.
- **API key**: `options.apiKey` > `OPENAI_API_KEY` env.
- **Base URL**: `options.baseURL` > `OPENAI_BASE_URL` env > `"https://api.openai.com/v1"`. Trailing slashes stripped.

## OpenCode session mode (slower)

- Goes through `api.client.session.create` + `api.client.session.prompt` + `api.client.session.delete`.
- Creates a temporary enhancement session with model and optional agent, prompts it, extracts text from response parts, then deletes the session in `finally`. Do not rely on temporary sessions surviving.
- **Model resolution** (`resolveOpenCodeModel`): If `providerID`+`modelID` are set, use those. Else parse `model` as `"provider/modelID"` — bare value uses default provider.
- **Fallback chain** when no model is explicitly configured: `deepseek-v4-flash-free` -> `big-pickle` -> `minimax-m2.5-free` -> `nemotron-3-super-free` -> `qwen3.6-plus-free`. All use `providerID: "opencode"`. Failed models produce combined error messages.
- `ensureModelAvailable()` checks `api.state.provider` array existence and model availability; throws clear messages if a provider/model isn't connected.

## Auto mode selection

`resolveMode()` determines the mode:
- Returns `"direct"` by default.
- Returns `"opencode"` if `options.providerID`, `options.modelID`, or `options.model` contains `"/"`.

## Environment variables

| Variable | Used in |
|---|---|
| `OPENAI_API_KEY` | Direct mode API key (fallback from `options.apiKey`) |
| `OPENAI_BASE_URL` | Direct mode base URL override |
| `OPENAI_ENHANCE_MODEL` | Direct mode model override (before `options.model`, after `options.directModel`) |
| `OPENCODE_ENHANCE_MOCK_TEXT` | Bypasses all provider calls; writes this value directly |

## Security constraints

- Never log prompt contents, provider responses, credentials, or local secret file contents.
- Never commit real credentials, `.env*` files, or populated `examples/tui.json` values. Examples must use placeholders only.
- Prompt text is sent to the configured provider for rewriting. In direct mode it goes to the OpenAI-compatible endpoint; in opencode mode it goes through OpenCode's provider path. Do not route prompts containing secrets unless your provider policy allows it.

## Files to avoid

- Leave `.omo/` alone. It is untracked OpenCode continuation/runtime state.
- Leave `.serena/` alone. It is Serena project state.
