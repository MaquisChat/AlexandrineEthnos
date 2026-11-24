// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, type MockInstance, vi } from "vitest";
import { App, type StageLike } from "../src/App";
import { SceneLoadError, WebGLUnavailableError } from "../src/stage/errors";
import type { LoadedScene } from "../src/stage/loadScene";

let consoleError: MockInstance;
beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

const failing = (error: unknown) => async () => {
  throw error;
};

it("shows which file could not be loaded", async () => {
  render(<App load={failing(new SceneLoadError("model_missing", "content/models/waters-edge.glb"))} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load content/models/waters-edge.glb.");
});

it("explains when WebGL is unavailable", async () => {
  render(
    <App
      load={async () => ({}) as LoadedScene}
      createStage={() => {
        throw new WebGLUnavailableError();
      }}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("This game needs WebGL");
});

it("says what is wrong with a scene file that is not valid", async () => {
  const error = new SceneLoadError(
    "scene_invalid",
    "content/scenes/x.scene.json",
    "walk.start: names a node that does not exist",
  );
  render(<App load={failing(error)} />);
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Could not load content/scenes/x.scene.json.");
  expect(alert).toHaveTextContent("walk.start: names a node that does not exist");
});

it("logs the underlying error for whoever is debugging", async () => {
  const error = new Error("The figure file has no \"idle\" animation.");
  render(<App load={failing(error)} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong while opening the scene.");
  expect(consoleError).toHaveBeenCalledWith(error);
});

it("stops the scene and removes its buttons when it fails after starting", async () => {
  const dispose = vi.fn();
  const ready = Promise.reject(new SceneLoadError("mark_missing", "content/marks/heron.svg"));
  ready.catch(() => {});
  const stage: StageLike = { start: () => {}, dispose, activateHotspot: () => true, ready };
  const loaded = {
    scene: {
      hotspots: [{ id: "post", kind: "object", label: "A post with a mark", position: [0, 0, 0], radius: 1, walkNode: "a" }],
      palette: { structure: "#241c26", mark: "#f4ead7", accent: "#d9502f" },
    },
  } as unknown as LoadedScene;

  render(<App load={async () => loaded} createStage={() => stage} />);

  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load content/marks/heron.svg.");
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "A post with a mark" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Larger text" })).not.toBeNull();
});
