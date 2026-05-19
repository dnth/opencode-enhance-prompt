# Contributing

Thanks for helping improve OpenCode Enhance Prompt.

## Local Setup

```bash
git clone https://github.com/dnth/opencode-enhance-prompt.git
cd opencode-enhance-prompt
npm run check
```

To test inside OpenCode, point your `~/.config/opencode/tui.json` plugin entry at your local checkout.

## Guidelines

- Keep the plugin small and dependency-free unless a dependency clearly improves user safety or compatibility.
- Do not add logging for prompt contents, provider responses, or credentials.
- Do not commit real API keys, tokens, `.env` files, or local secret files.
- Preserve the behavior that enhancement rewrites the prompt but never submits it automatically.
- Include clear reproduction steps for bug reports.

## Pull Requests

Before opening a pull request:

1. Run `npm run check`.
2. Test the command in OpenCode if your change affects runtime behavior.
3. Confirm that examples contain placeholders only.
4. Explain the user-visible change and any compatibility impact.
