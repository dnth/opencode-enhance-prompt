# OpenCode Enhance Prompt

OpenCode TUI plugin that rewrites your current draft prompt with OpenAI before you submit it. Type a rough prompt, press `ctrl+x w`, review the rewritten prompt, then press Enter when you are ready.

The plugin changes only the text in the active prompt box. It does not submit the prompt automatically and it does not log prompt contents.

## Features

- Adds an `Enhance prompt` command to the OpenCode command palette.
- Binds the command to `ctrl+x w` by default.
- Falls back to `ctrl+x shift+w` if `ctrl+x w` is already bound.
- Reads the OpenAI API key from `OPENAI_API_KEY` or a local key file.
- Lets you choose the OpenAI model from `tui.json` or `OPENAI_ENHANCE_MODEL`.
- Preserves the original prompt if enhancement fails.

## Requirements

- OpenCode with TUI plugin support.
- Node.js 18 or newer.
- An OpenAI API key with access to the model you configure.

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
    [
      "./plugins/enhance-prompt/index.js",
      {
        "apiKeyFile": "~/.config/opencode/secrets/openai-api-key",
        "model": "gpt-5-nano"
      }
    ]
  ]
}
```

Restart OpenCode after changing `tui.json`.

## OpenAI API Key

The plugin checks credentials in this order:

1. `OPENAI_API_KEY`
2. `apiKeyFile` from `tui.json`
3. `~/.config/opencode/secrets/openai-api-key`

Recommended local key-file setup:

```bash
mkdir -p ~/.config/opencode/secrets
chmod 700 ~/.config/opencode/secrets
printf '%s\n' 'replace-with-your-openai-api-key' > ~/.config/opencode/secrets/openai-api-key
chmod 600 ~/.config/opencode/secrets/openai-api-key
```

Do not commit this key file. The repository includes only placeholder configuration.

## Configuration

Plugin options in `tui.json`:

| Option | Default | Description |
| --- | --- | --- |
| `apiKeyFile` | `~/.config/opencode/secrets/openai-api-key` | File containing the OpenAI API key. |
| `model` | `gpt-5-nano` | OpenAI chat completions model used to rewrite prompts. |

Environment variables:

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | Overrides any key file. |
| `OPENAI_ENHANCE_MODEL` | Overrides the configured model. |
| `OPENAI_ENHANCE_MOCK_TEXT` | Test helper that skips OpenAI and writes deterministic text. |

## Usage

1. Start OpenCode.
2. Type a draft prompt in the prompt box.
3. Press `ctrl+x w` or open the command palette with `ctrl+p` and select `Enhance prompt`.
4. Review or edit the rewritten prompt.
5. Press Enter to submit it.

If the prompt is empty, the plugin shows `Type a prompt first`. If OpenAI returns an error, the original prompt remains unchanged.

## Security Notes

- Never hard-code API keys in `index.js`, `tui.json`, shell history, or issue reports.
- Prefer a local key file with `600` permissions or a secret manager that exports `OPENAI_API_KEY` only for the OpenCode process.
- The plugin sends the draft prompt to OpenAI because that is required for rewriting. Do not use it for prompts containing secrets unless your OpenAI usage policy allows that data to be sent.
- Prompt contents and OpenAI responses are not written to disk by this plugin.

## Development

Run the syntax check:

```bash
npm run check
```

For deterministic local testing without calling OpenAI:

```bash
OPENAI_ENHANCE_MOCK_TEXT='Rewrite this prompt.' opencode
```

## License

MIT
