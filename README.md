# OpenCode Enhance Prompt

OpenCode TUI plugin that rewrites your current draft prompt before you submit it. Type a rough prompt, press `ctrl+x w`, review the rewritten prompt, edit it if needed, then press Enter when you are ready.

The plugin only changes the text in the active prompt box. It does not submit prompts automatically and it does not log prompt contents, provider responses, or credentials.

## Features

### Prompt Enhancement

- `Enhance prompt` command in the OpenCode command palette.
- Default keybind: `ctrl+x w` (`<leader>w`).
- Automatic fallback keybind: `ctrl+x shift+w` (`<leader>shift+w`) when the default binding already appears in your TUI config.
- Works from both the home prompt and session prompt by tracking the currently active prompt box.
- Rewrites the prompt in place and clears stale prompt parts so the new draft is ready to review.
- Uses a concise system instruction that preserves the original meaning, makes the prompt specific and actionable, and returns only the rewritten prompt.

Example:

```text
Before: fix auth bug
After: Diagnose and fix the authentication bug causing users to be redirected after login. Identify the root cause, update the minimal affected code, and verify the login flow still works.
```

### Repeated Enhancements

Run `Enhance prompt` again on an already enhanced draft to get a fresh alternative variation instead of a tiny edit of the same wording.

Example flow:

```text
1. Type a rough prompt.
2. Press ctrl+x w to enhance it.
3. Press ctrl+x w again if you want a different version.
4. Keep, edit, or undo the result before submitting.
```

### Undo Enhancement

- `Undo prompt enhancement` command in the command palette.
- Default keybind: `ctrl+x z` (`<leader>z`).
- Restores the prompt text that existed immediately before the enhancement.
- Keeps up to 10 enhancement history entries.
- Shows a message if there is nothing to undo or the prompt reference has expired.

Example:

```text
Press ctrl+x z after an enhancement to restore the previous draft.
```

### Direct Provider Mode

Direct mode is the default. It sends the current draft to an OpenAI-compatible `/chat/completions` endpoint for lower latency than routing through an OpenCode session.

Default direct settings:

- Base URL: `https://api.openai.com/v1`
- Model: `gpt-5-nano`
- Timeout: `30000` milliseconds
- Max completion tokens: `800`
- GPT-5 reasoning effort: `low`
- GPT-5 verbosity: `low`

Example shell setup:

```bash
export OPENAI_API_KEY="sk-placeholder"
opencode
```

Example custom direct config in `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "./plugins/enhance-prompt/index.js",
      {
        "mode": "direct",
        "baseURL": "https://api.example.com/v1",
        "directModel": "gpt-5-nano",
        "maxTokens": 800,
        "reasoningEffort": "low",
        "verbosity": "low",
        "timeout": 30000
      }
    ]
  ]
}
```

### OpenCode Session Mode

Set `mode` to `"opencode"` to enhance prompts through OpenCode's `session.prompt` API instead of the direct HTTP provider. This creates a temporary OpenCode session, sends the prompt through the selected OpenCode provider/model, extracts the text response, then cleans up the temporary session.

Example OpenCode mode config:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "./plugins/enhance-prompt/index.js",
      {
        "mode": "opencode",
        "providerID": "opencode",
        "modelID": "deepseek-v4-flash-free",
        "agent": "build",
        "timeout": 30000
      }
    ]
  ]
}
```

When no OpenCode model is explicitly configured, the plugin tries these models in order:

1. `opencode/deepseek-v4-flash-free`
2. `opencode/big-pickle`
3. `opencode/minimax-m2.5-free`
4. `opencode/nemotron-3-super-free`
5. `opencode/qwen3.6-plus-free`

If you configure `providerID`, `modelID`, or `model`, the plugin uses only that configured model. It also checks OpenCode's connected providers when provider state is available and reports a clear error if the provider or model is missing.

### Automatic Mode Selection

If `mode` is not set, the plugin chooses the mode from your options:

- Uses `direct` by default.
- Uses `opencode` when you set `providerID`, `modelID`, or a `model` value containing `/`.
- Treats a bare `model` as a direct-mode model unless OpenCode mode is selected through other options.

Examples:

```json
{ "model": "gpt-5-nano" }
```

```json
{ "model": "opencode/deepseek-v4-flash-free" }
```

### Safety And Status Messages

The plugin keeps the current prompt unchanged when enhancement fails.

It also shows short TUI toast messages for common states:

- `No active prompt found`
- `Type a prompt first`
- `Prompt enhancement already running`
- `Enhancing prompt...`
- `Prompt enhanced`
- Provider error or timeout text
- `Nothing to undo`
- `Reverted to original prompt`

Only one enhancement request can run at a time, so repeated key presses do not start overlapping provider calls.

### Mock Testing

Set `OPENCODE_ENHANCE_MOCK_TEXT` to bypass provider calls and write deterministic text into the prompt. This is useful for local smoke testing without credentials.

Example:

```bash
OPENCODE_ENHANCE_MOCK_TEXT='Rewrite this prompt.' opencode
```

## Requirements

- OpenCode with TUI plugin support.
- Node.js 18 or newer.
- `OPENAI_API_KEY` for default direct mode, unless you use `mode: "opencode"` or `OPENCODE_ENHANCE_MOCK_TEXT`.

## Installation

Clone this repository somewhere under your OpenCode config directory:

```bash
git clone https://github.com/dnth/opencode-enhance-prompt.git ~/.config/opencode/plugins/enhance-prompt
```

Create or update `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "./plugins/enhance-prompt/index.js"
  ]
}
```

Restart OpenCode after changing `tui.json`.

File-path plugins are resolved relative to the config file that declares them, so the example path above is relative to `~/.config/opencode/tui.json`.

## Configuration Reference

Plugin options in `tui.json`:

| Option | Default | Description |
| --- | --- | --- |
| `mode` | auto | `direct` for an OpenAI-compatible HTTP call, or `opencode` for OpenCode session mode. |
| `apiKey` | `OPENAI_API_KEY` | Direct-mode API key. Prefer the environment variable over putting secrets in config. |
| `baseURL` | `https://api.openai.com/v1` | Direct-mode OpenAI-compatible API base URL. Trailing slashes are removed automatically. |
| `model` | `gpt-5-nano` in direct mode | Direct-mode model, bare OpenCode model ID in OpenCode mode, or `provider/model` to select OpenCode mode automatically. |
| `directModel` | unset | Direct-mode model override. Takes precedence over `OPENAI_ENHANCE_MODEL` and `model`. |
| `timeout` | `30000` | Request timeout in milliseconds for direct calls and OpenCode session operations. |
| `maxTokens` | `800` | Direct-mode `max_completion_tokens` value. |
| `reasoningEffort` | `low` for GPT-5 models | Direct-mode `reasoning_effort`; omitted by default for non-GPT-5 models. |
| `verbosity` | `low` for GPT-5 models | Direct-mode `verbosity`; omitted by default for non-GPT-5 models. |
| `providerID` | `opencode` in OpenCode mode | OpenCode provider ID. Use with `modelID`. |
| `modelID` | `deepseek-v4-flash-free` in OpenCode mode | OpenCode model ID. Use with `providerID`. |
| `agent` | OpenCode default agent | Optional OpenCode agent used when creating and prompting the temporary enhancement session. |

Environment variables:

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | API key for default direct mode. |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible base URL for direct mode. |
| `OPENAI_ENHANCE_MODEL` | Optional direct-mode model override. Used after `directModel` and before `model`. |
| `OPENCODE_ENHANCE_MOCK_TEXT` | Test helper that skips provider calls and writes this value into the prompt. |

## Usage

1. Start OpenCode.
2. Type a draft prompt in the prompt box.
3. Press `ctrl+x w`, or open the command palette with `ctrl+p` and select `Enhance prompt`.
4. Review the rewritten prompt.
5. Press `ctrl+x w` again for another variation, or `ctrl+x z` to undo the last enhancement.
6. Edit the prompt if needed.
7. Press Enter only when you are ready to submit.

The plugin never submits the enhanced prompt for you.

## Security Notes

- Never hard-code real provider API keys in `index.js`, `tui.json`, shell history, examples, or issue reports.
- The plugin sends the draft prompt to the configured direct provider because that is required for rewriting. Do not use it for prompts containing secrets unless your provider usage policy allows that data to be sent.
- In `mode: "opencode"`, the prompt goes through OpenCode's normal provider/session path while the temporary enhancement session is running.
- Prompt contents and provider responses are not written to disk by this plugin.

## Development

This is a single-file plugin. Runtime logic lives in `index.js`, and package discovery depends on the default export plus the `./tui` export in `package.json`.

Run the syntax check:

```bash
npm run check
```

Run a deterministic local smoke test without calling a provider:

```bash
OPENCODE_ENHANCE_MOCK_TEXT='Rewrite this prompt.' opencode
```

## License

MIT
