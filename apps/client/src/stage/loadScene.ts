import { parseScene, type Scene, SceneParseError } from "@fieldwork/contracts";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { SceneLoadError } from "./errors";

export interface LoadedScene {
  scene: Scene;
  /** Model files by the id the scene gives them. */
  models: Map<string, GLTF>;
  figure: GLTF;
}

export interface LoadDeps {
  fetchJson?: (url: string) => Promise<unknown>;
  loadGltf?: (url: string) => Promise<GLTF>;
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function defaultLoadGltf(url: string): Promise<GLTF> {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  return new GLTFLoader().loadAsync(url);
}

/**
 * Loads a scene file, checks it, and loads every model it names plus the figure.
 * All paths are relative to `contentRoot`. Throws SceneLoadError naming the file that failed.
 */
export async function loadScene(
  contentRoot: string,
  sceneFile: string,
  figureFile: string,
  deps: LoadDeps = {},
): Promise<LoadedScene> {
  const fetchJson = deps.fetchJson ?? defaultFetchJson;
  const loadGltf = deps.loadGltf ?? defaultLoadGltf;
  const sceneUrl = contentRoot + sceneFile;

  let raw: unknown;
  try {
    raw = await fetchJson(sceneUrl);
  } catch {
    throw new SceneLoadError("scene_not_found", sceneUrl);
  }

  let scene: Scene;
  try {
    scene = parseScene(raw);
  } catch (error) {
    if (error instanceof SceneParseError) throw new SceneLoadError("scene_invalid", sceneUrl, error.issues.join("; "));
    throw error;
  }

  const model = async (file: string) => {
    const url = contentRoot + file;
    try {
      return await loadGltf(url);
    } catch {
      throw new SceneLoadError("model_missing", url);
    }
  };

  const [figure, ...sets] = await Promise.all([model(figureFile), ...scene.models.map((m) => model(m.uri))]);
  const models = new Map(scene.models.map((m, i) => [m.id, sets[i]!]));
  return { scene, models, figure: figure! };
}
