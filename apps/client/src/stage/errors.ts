export type SceneLoadFailure = "scene_not_found" | "scene_invalid" | "model_missing" | "mark_missing";

/** A scene, or a file it needs, could not be loaded. `file` is the path that failed. */
export class SceneLoadError extends Error {
  readonly kind: SceneLoadFailure;
  readonly file: string;
  /** What exactly is wrong, when known: for an invalid scene, the list of problems. */
  readonly detail: string | undefined;
  constructor(kind: SceneLoadFailure, file: string, detail?: string) {
    super(detail ? `Could not load ${file}. ${detail}` : `Could not load ${file}.`);
    this.name = "SceneLoadError";
    this.kind = kind;
    this.file = file;
    this.detail = detail;
  }
}

/** The browser could not start WebGL, so nothing can be drawn. */
export class WebGLUnavailableError extends Error {
  constructor() {
    super("WebGL is not available.");
    this.name = "WebGLUnavailableError";
  }
}
