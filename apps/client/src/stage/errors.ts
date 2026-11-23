export type SceneLoadFailure = "scene_not_found" | "scene_invalid" | "model_missing";

/** A scene, or a file it needs, could not be loaded. `file` is the path that failed. */
export class SceneLoadError extends Error {
  readonly kind: SceneLoadFailure;
  readonly file: string;
  constructor(kind: SceneLoadFailure, file: string, detail?: string) {
    super(detail ? `Could not load ${file}. ${detail}` : `Could not load ${file}.`);
    this.name = "SceneLoadError";
    this.kind = kind;
    this.file = file;
  }
}

/** The browser could not start WebGL, so nothing can be drawn. */
export class WebGLUnavailableError extends Error {
  constructor() {
    super("WebGL is not available.");
    this.name = "WebGLUnavailableError";
  }
}
