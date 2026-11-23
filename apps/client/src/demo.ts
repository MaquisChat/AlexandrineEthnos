// M0 has no service. Everything the client shows beyond the scene itself is this fixture data.
export const DEMO = {
  contentRoot: "content/",
  sceneFile: "scenes/waters-edge.scene.json",
  figureFile: "models/figure.glb",
  marks: { "post-mark": "marks/heron.svg" },
  actors: [{ slot: "actor-maelle", name: "Maëlle" }],
} as const;
