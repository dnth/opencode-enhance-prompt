# OpenCode Enhance Prompt

OpenCode TUI plugin that rewrites your current draft prompt with a direct OpenAI-compatible API call before you submit it. Type a rough prompt, press `ctrl+x w`, review the rewritten prompt, then press Enter when you are ready.

The plugin changes only the text in the active prompt box. It does not submit the prompt automatically and it does not log prompt contents.

## Features

- Adds an `Enhance prompt` command to the OpenCode command palette.
- Binds the command to `ctrl+x w` by default.
- Falls back to `ctrl+x shift+w` if `ctrl+x w` is already bound.
- Uses a direct OpenAI-compatible API call by default for lower latency.
- Can still use OpenCode's session provider path with `mode: "opencode"` when you want that integration.
- Preserves the original prompt if enhancement fails.

## Requirements

- OpenCode with TUI plugin support.
- Node.js 18 or newer.
- `OPENAI_API_KEY` for direct enhancement, or an OpenAI-compatible endpoint configured with `OPENAI_BASE_URL`.

## Installation

Clone this repository somewhere on your machine:

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

## Provider setup

For the default direct mode, export `OPENAI_API_KEY` before launching OpenCode. You can point at any OpenAI-compatible endpoint with `OPENAI_BASE_URL` and choose a model with `OPENAI_ENHANCE_MODEL` or the plugin `model` option.

If you set `mode` to `"opencode"`, the plugin uses OpenCode's `session.prompt` API instead. That path can be slower because it creates a temporary OpenCode session and runs through the normal agent loop.

## Configuration

Plugin options in `tui.json`:

| Option | Default | Description |
| --- | --- | --- |
| `mode` | `direct` | Use `direct` for a fast OpenAI-compatible HTTP call, or `opencode` to route through OpenCode sessions. |
| `model` | `gpt-5-nano` | Direct-mode model. Also accepts a bare OpenCode model ID when `mode` is `opencode`. |
| `directModel` | unset | Direct-mode model override that takes precedence over `model`. |
| `baseURL` | `https://api.openai.com/v1` | OpenAI-compatible API base URL for direct mode. |
| `timeout` | `30000` | Request timeout in milliseconds. |
| `providerID` + `modelID` | `opencode` + `deepseek-v4-flash-free` | OpenCode-session mode model selection. |
| `agent` | OpenCode default agent | Optional OpenCode agent for `mode: "opencode"`. |

With zero config, the direct path uses `OPENAI_API_KEY`, `https://api.openai.com/v1`, and `gpt-5-nano`. In `mode: "opencode"`, the plugin tries `opencode/deepseek-v4-flash-free` first, then falls back through `opencode/big-pickle`, `opencode/minimax-m2.5-free`, `opencode/nemotron-3-super-free`, and `opencode/qwen3.6-plus-free`.

Environment variables:

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | API key for the default direct mode. |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible base URL. |
| `OPENAI_ENHANCE_MODEL` | Optional direct-mode model override. |
| `OPENCODE_ENHANCE_MOCK_TEXT` | Test helper that skips the provider call and writes deterministic text. |

## Usage

1. Start OpenCode.
2. Type a draft prompt in the prompt box.
3. Press `ctrl+x w` or open the command palette with `ctrl+p` and select `Enhance prompt`.
4. Review or edit the rewritten prompt.
5. Press Enter to submit it.

If the prompt is empty, the plugin shows `Type a prompt first`. If enhancement fails, the original prompt remains unchanged.

## Security Notes

- Never hard-code provider API keys in `index.js`, `tui.json`, shell history, or issue reports.
- The plugin sends the draft prompt to the configured direct provider because that is required for rewriting. Do not use it for prompts containing secrets unless your provider usage policy allows that data to be sent.
- Prompt contents and provider responses are not written to disk by this plugin. If you opt into `mode: "opencode"`, OpenCode's normal temporary session handling applies while the enhancement request is running.

## Development

Run the syntax check:

```bash
npm run check
```

For deterministic local testing without calling a provider:

```bash
OPENCODE_ENHANCE_MOCK_TEXT='Rewrite this prompt.' opencode
```

## License

MIT
