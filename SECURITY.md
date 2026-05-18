# Security Policy

## Reporting a Vulnerability

Please report suspected security issues privately by opening a GitHub security advisory or by contacting the repository owner through GitHub. Do not include live API keys, tokens, or private prompt contents in public issues.

## Secret Handling

This project must not contain real credentials. Use placeholders in examples and keep local secrets outside the repository, such as:

```text
~/.config/opencode/secrets/openai-api-key
```

Recommended permissions:

```bash
chmod 700 ~/.config/opencode/secrets
chmod 600 ~/.config/opencode/secrets/openai-api-key
```

## Data Sent to OpenAI

The plugin sends the current draft prompt to the configured OpenAI model for rewriting. Review your organization policy before using it with sensitive, private, regulated, or proprietary prompt content.
