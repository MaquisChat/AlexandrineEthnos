// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { App } from "../src/App";
import { SceneLoadError, WebGLUnavailableError } from "../src/stage/errors";
import type { LoadedScene } from "../src/stage/loadScene";

afterEach(cleanup);

it("shows which file could not be loaded", async () => {
  render(
    <App
      load={async () => {
        throw new SceneLoadError("model_missing", "content/models/waters-edge.glb");
      }}
    />,
  );
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
