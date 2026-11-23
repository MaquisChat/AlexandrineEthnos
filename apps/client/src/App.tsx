import type { Scene } from "@fieldwork/contracts";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { DEMO } from "./demo";
import { SceneLoadError, WebGLUnavailableError } from "./stage/errors";
import { type LoadedScene, loadScene } from "./stage/loadScene";
import { Stage, type StageOptions } from "./stage/Stage";
import { DialogueStrip } from "./ui/DialogueStrip";
import { TextSizeControl } from "./ui/TextSizeControl";

/** What the app needs from a stage. The real one is `Stage`; tests pass their own. */
export type StageLike = Pick<Stage, "start" | "dispose" | "ready" | "activateHotspot">;

export interface AppProps {
  load?: () => Promise<LoadedScene>;
  createStage?: (canvas: HTMLCanvasElement, loaded: LoadedScene, opts: StageOptions) => StageLike;
}

declare global {
  interface Window {
    __stageReady?: boolean;
    __stage?: StageLike;
  }
}

const defaultLoad = () => loadScene(DEMO.contentRoot, DEMO.sceneFile, DEMO.figureFile);
const defaultCreateStage: NonNullable<AppProps["createStage"]> = (canvas, loaded, opts) => new Stage(canvas, loaded, opts);

function problemText(error: unknown): string {
  if (error instanceof SceneLoadError) return `Could not load ${error.file}.`;
  if (error instanceof WebGLUnavailableError) {
    return "This game needs WebGL, which is not available in this browser.";
  }
  return "Something went wrong while opening the scene.";
}

/** The scene's palette as CSS variables, so the interface wears the culture's colours. */
function paletteVariables(palette: Scene["palette"] | null): CSSProperties {
  if (!palette) return {};
  return Object.fromEntries(Object.entries(palette).map(([role, colour]) => [`--c-${role}`, colour])) as CSSProperties;
}

export function App({ load = defaultLoad, createStage = defaultCreateStage }: AppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<StageLike | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Scene["hotspots"]>([]);
  const [palette, setPalette] = useState<Scene["palette"] | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [dialogue] = useState(() =>
    new URLSearchParams(window.location.search).get("line") === "kk" ? DEMO.kazakhLine : DEMO.dialogue,
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSpeaking(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get("shot") === "1";
    const debug = shot || params.get("debug") === "1" || import.meta.env.DEV;
    let cancelled = false;
    let stage: StageLike | null = null;

    (async () => {
      try {
        const loaded = await load();
        if (cancelled || !canvasRef.current) return;
        stage = createStage(canvasRef.current, loaded, {
          ...(shot ? { fixedTimeSeconds: 0 } : {}),
          marks: Object.fromEntries(Object.entries(DEMO.marks).map(([slot, file]) => [slot, DEMO.contentRoot + file])),
          actors: [...DEMO.actors],
          // The only person in the demo scene is Maëlle; reaching her opens the fixture line.
          onHotspot: (id) => setSpeaking(id === "maelle"),
        });
        stageRef.current = stage;
        setHotspots(loaded.scene.hotspots);
        setPalette(loaded.scene.palette);
        if (shot) setSpeaking(true);
        stage.start();
        await stage.ready;
        if (cancelled) return;
        if (debug) window.__stage = stage;
        window.__stageReady = true;
      } catch (error) {
        if (!cancelled) setProblem(problemText(error));
      }
    })();

    return () => {
      cancelled = true;
      stage?.dispose();
      stageRef.current = null;
    };
  }, [load, createStage]);

  return (
    <div className="frame" style={paletteVariables(palette)}>
      <canvas ref={canvasRef} className="stage" />
      {/* Keyboard access to everything that can be clicked in the scene. Hidden until focused. */}
      <nav className="hotspots" aria-label="Things in this place">
        {hotspots.map((hotspot) => (
          <button key={hotspot.id} type="button" onClick={() => stageRef.current?.activateHotspot(hotspot.id)}>
            {hotspot.label}
          </button>
        ))}
      </nav>
      {problem === null && palette !== null && <TextSizeControl />}
      {problem === null && speaking && (
        <DialogueStrip
          speaker={dialogue.speaker}
          tokens={[...dialogue.tokens]}
          suggestions={[...dialogue.suggestions]}
          // M0 has no service, so these do nothing yet: the client holds no rules of its own.
          onTapWord={() => {}}
          onSay={() => {}}
          onSimpler={() => {}}
          onTranslation={() => {}}
          onClip={() => {}}
        />
      )}
      {problem !== null && (
        <div role="alert" className="problem">
          {problem}
        </div>
      )}
    </div>
  );
}
