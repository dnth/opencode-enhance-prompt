# OpenCode Enhance Prompt

OpenCode TUI plugin that rewrites your current draft prompt with OpenCode's connected providers before you submit it. Type a rough prompt, press `ctrl+x w`, review the rewritten prompt, then press Enter when you are ready.

The plugin changes only the text in the active prompt box. It does not submit the prompt automatically and it does not log prompt contents.

## Features

- Adds an `Enhance prompt` command to the OpenCode command palette.
- Binds the command to `ctrl+x w` by default.
- Falls back to `ctrl+x shift+w` if `ctrl+x w` is already bound.
- Uses the providers and credentials already connected to OpenCode.
- Lets you choose an optional OpenCode model from `tui.json`.
- Preserves the original prompt if enhancement fails.

## Requirements

- OpenCode with TUI plugin support.
- Node.js 18 or newer.
- At least one provider connected in OpenCode.

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

Connect providers in OpenCode with `/connect` or `opencode providers`. The plugin uses OpenCode's runtime client, so it does not read provider API keys itself.

## Configuration

Plugin options in `tui.json`:

| Option | Default | Description |
| --- | --- | --- |
| `model` | `opencode/deepseek-v4-flash-free` | Optional model in `provider/model` format. A bare model ID is treated as an opencode model. |
| `providerID` + `modelID` | `opencode` + `deepseek-v4-flash-free` | Alternative way to configure the model. |
| `agent` | OpenCode default agent | Optional OpenCode agent to use for the temporary enhancement session. |

With zero config, the plugin tries `opencode/deepseek-v4-flash-free` first, then falls back through `opencode/big-pickle`, `opencode/minimax-m2.5-free`, `opencode/nemotron-3-super-free`, and `opencode/qwen3.6-plus-free`.

Environment variables:

| Variable | Description |
| --- | --- |
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
- The plugin sends the draft prompt to the connected provider selected by OpenCode because that is required for rewriting. Do not use it for prompts containing secrets unless your provider usage policy allows that data to be sent.
- Prompt contents and provider responses are not written to disk by this plugin, except for OpenCode's normal temporary session handling while the enhancement request is running.

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
