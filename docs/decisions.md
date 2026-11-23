# Decisions

Choices that change what a player experiences, or that a later builder would otherwise have to rediscover. Newest last.

## 2026-11-23: Scene cross-reference rules live in the parser, not in the JSON Schema

The published `scene.schema.json` checks the shape of a scene. It cannot express rules that link one part of a scene to another (unique ids within a list; walk edges, `walk.start` and hotspot `walkNode` naming existing nodes; `fog.near` less than `fog.far`). Those rules are enforced by `parseScene` in `@fieldwork/contracts` and are listed in the schema's description. A client in another engine must implement them itself.

## 2026-11-23: The login provider switches the command line's tools off

`LoginProvider` runs `claude -p --output-format json --system-prompt <ours> --tools "" --strict-mcp-config`, from a neutral directory. Measured on this date: with only `--system-prompt`, one call carried about 39,800 tokens of built-in instructions; with tools and connectors off, about 2,800. The requested model is not passed, so the login serves its own model (`claude-fable-5-2` in the test) and the response reports which. `maxTokens` cannot be set through the command line and is ignored by this provider. The provider is for development only and draws on the owner's Claude plan.

## 2026-11-23: The login provider switches the command line's tools off

`LoginProvider` runs `claude -p --output-format json --system-prompt <ours> --tools "" --strict-mcp-config`, from a neutral directory. Measured on this date: with only `--system-prompt`, one call carried about 39,800 tokens of built-in instructions; with tools and connectors off, about 2,800. The requested model is not passed, so the login serves its own model (`claude-fable-5-2` in the test) and the response reports which. `maxTokens` cannot be set through the command line and is ignored by this provider. The provider is for development only and draws on the owner's Claude plan.
