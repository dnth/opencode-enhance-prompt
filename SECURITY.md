# Security Policy

## Reporting a Vulnerability

Please report suspected security issues privately by opening a GitHub security advisory or by contacting the repository owner through GitHub. Do not include live API keys, tokens, or private prompt contents in public issues.

## Secret Handling

This project must not contain real credentials. Keep provider credentials in environment variables or your secret manager, not in this repository or example files.

## Data Sent to Providers

The plugin sends the current draft prompt to the configured direct provider for rewriting. If `mode: "opencode"` is enabled, it sends the prompt through OpenCode's session provider path instead. Review your organization policy before using it with sensitive, private, regulated, or proprietary prompt content.
