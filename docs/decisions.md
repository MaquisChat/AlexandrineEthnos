# Decisions

Choices that change what a player experiences, or that a later builder would otherwise have to rediscover. Newest last.

## 2026-11-23: Scene cross-reference rules live in the parser, not in the JSON Schema

The published `scene.schema.json` checks the shape of a scene. It cannot express rules that link one part of a scene to another (unique ids within a list; walk edges, `walk.start` and hotspot `walkNode` naming existing nodes; `fog.near` less than `fog.far`). Those rules are enforced by `parseScene` in `@fieldwork/contracts` and are listed in the schema's description. A client in another engine must implement them itself.
