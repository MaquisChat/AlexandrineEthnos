// Draws one scene: flat unlit colour, fog for depth, a camera drifting on its rail,
// figures on the shared skeleton, and the culture's marks. Holds no game rules.
import { FIGURE_ANIMATIONS, type Scene, type Vec3 } from "@fieldwork/contracts";
import * as THREE from "three";
import { SceneLoadError, WebGLUnavailableError } from "./errors";
import type { LoadedScene } from "./loadScene";
import { applyPalette } from "./palette";
import { railPose } from "./rail";
import { nearestNode, Walker } from "./walk";

export interface StageOptions {
  /** Render this one instant and never advance. Used for screenshots. */
  fixedTimeSeconds?: number;
  /** Mark image (SVG) for each mark slot, by slot id. */
  marks?: Record<string, string>;
  /** A standing figure for each actor slot. */
  actors?: { slot: string; name: string }[];
  /** Called when the player's figure arrives at a hotspot it was sent to. */
  onHotspot?: (id: string) => void;
}

interface Figure {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Record<(typeof FIGURE_ANIMATIONS)[number], THREE.AnimationAction>;
  current: (typeof FIGURE_ANIMATIONS)[number];
}

const MARK_TEXTURE_PX = 256;

export class Stage {
  /** Resolves once marks are in place and the first frame is drawn. */
  readonly ready: Promise<void>;

  private readonly scene: Scene;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly world = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly walker: Walker;
  private readonly player: Figure;
  private readonly figures: Figure[] = [];
  private readonly opts: StageOptions;
  private readonly canvas: HTMLCanvasElement;
  private readonly resizeObserver: ResizeObserver | undefined;
  private pendingHotspot: string | null = null;
  private frame = 0;
  private lastTime: number | null = null;
  private elapsed = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, loaded: LoadedScene, opts: StageOptions = {}) {
    this.canvas = canvas;
    this.scene = loaded.scene;
    this.opts = opts;

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      throw new WebGLUnavailableError();
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const { palette, fog, camera } = this.scene;
    this.world.background = new THREE.Color(palette.sky);
    this.world.fog = new THREE.Fog(palette.fog, fog.near, fog.far);
    this.camera = new THREE.PerspectiveCamera(camera.fovDeg, 16 / 9, 0.1, 400);

    for (const model of this.scene.models) {
      const object = loaded.models.get(model.id)!.scene.clone(true);
      object.position.set(...model.position);
      object.rotation.y = THREE.MathUtils.degToRad(model.rotationYDeg);
      object.scale.setScalar(model.scale);
      applyPalette(object, palette);
      this.world.add(object);
    }

    this.walker = new Walker(this.scene.walk);
    this.player = this.addFigure(loaded, this.walker.update(0).position, 0, 1);
    for (const actor of opts.actors ?? []) {
      const slot = this.scene.slots.find((s) => s.id === actor.slot && s.kind === "actor");
      if (!slot) throw new Error(`The scene has no actor slot "${actor.slot}" for ${actor.name}.`);
      this.addFigure(loaded, slot.position, THREE.MathUtils.degToRad(slot.rotationYDeg), slot.size);
    }

    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        // Resizing clears the canvas, so draw again at once or the scene blinks.
        this.resize();
        this.draw(this.opts.fixedTimeSeconds ?? this.elapsed, 0);
      });
      this.resizeObserver.observe(canvas);
    }
    canvas.addEventListener("pointerdown", this.onPointerDown);

    this.ready = this.addMarks().then(() => {
      if (!this.disposed) this.draw(this.opts.fixedTimeSeconds ?? 0, 0);
    });
  }

  /** Starts the scene moving. With a fixed time set, the scene stays still. */
  start(): void {
    if (this.opts.fixedTimeSeconds !== undefined || this.disposed) return;
    const tick = (now: number) => {
      const dt = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.elapsed += dt;
      this.draw(this.elapsed, dt);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.dispose();
  }

  /** Sends the player's figure to a walk node. False if it cannot get there. */
  walkTo(nodeId: string): boolean {
    this.pendingHotspot = null;
    return this.walker.goTo(nodeId);
  }

  /** Sends the player's figure to a hotspot; `onHotspot` is called when it arrives. */
  activateHotspot(id: string): boolean {
    const hotspot = this.scene.hotspots.find((h) => h.id === id);
    if (!hotspot || !this.walker.goTo(hotspot.walkNode)) return false;
    this.pendingHotspot = id;
    return true;
  }

  figurePosition(): Vec3 {
    return this.walker.update(0).position;
  }

  private addFigure(loaded: LoadedScene, position: Vec3, headingRad: number, scale: number): Figure {
    const root = loaded.figure.scene.clone(true);
    root.position.set(...position);
    root.rotation.y = headingRad;
    root.scale.setScalar(scale);
    applyPalette(root, this.scene.palette);
    this.world.add(root);

    const mixer = new THREE.AnimationMixer(root);
    const action = (name: string) => {
      const clip = loaded.figure.animations.find((c) => c.name === name);
      if (!clip) throw new Error(`The figure file has no "${name}" animation.`);
      return mixer.clipAction(clip);
    };
    const figure: Figure = { root, mixer, actions: { idle: action("idle"), walk: action("walk") }, current: "idle" };
    figure.actions.idle.play();
    this.figures.push(figure);
    return figure;
  }

  /** Each mark is a flat plane in its slot, drawn in the palette's mark colour. */
  private async addMarks(): Promise<void> {
    const entries = Object.entries(this.opts.marks ?? {});
    await Promise.all(
      entries.map(async ([slotId, url]) => {
        const slot = this.scene.slots.find((s) => s.id === slotId && s.kind === "mark");
        if (!slot) throw new Error(`The scene has no mark slot "${slotId}".`);
        // A mark that cannot be loaded is reported by name, like a model: marks carry the culture's symbols.
        const bitmap = document.createElement("canvas");
        bitmap.width = bitmap.height = MARK_TEXTURE_PX;
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          const text = await response.text();
          if (!text.includes("<svg")) throw new Error("not an SVG file");
          const image = new Image();
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            text.replaceAll("currentColor", this.scene.palette.mark),
          )}`;
          await image.decode();
          bitmap.getContext("2d")!.drawImage(image, 0, 0, MARK_TEXTURE_PX, MARK_TEXTURE_PX);
        } catch (error) {
          throw new SceneLoadError("mark_missing", url, error instanceof Error ? error.message : undefined);
        }

        const texture = new THREE.CanvasTexture(bitmap);
        texture.colorSpace = THREE.SRGBColorSpace;
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(slot.size, slot.size),
          new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.5 }),
        );
        plane.position.set(...slot.position);
        plane.rotation.y = THREE.MathUtils.degToRad(slot.rotationYDeg);
        if (!this.disposed) this.world.add(plane);
      }),
    );
  }

  private resize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private draw(seconds: number, dt: number): void {
    const pose = railPose(this.scene.camera.rail, seconds, this.scene.camera.driftSeconds);
    this.camera.position.set(...pose.position);
    this.camera.lookAt(...pose.lookAt);

    const state = this.walker.update(dt);
    this.player.root.position.set(...state.position);
    this.player.root.rotation.y = state.headingRad;
    this.setAnimation(this.player, state.moving ? "walk" : "idle");

    if (this.pendingHotspot !== null && !state.moving) {
      const id = this.pendingHotspot;
      this.pendingHotspot = null;
      this.opts.onHotspot?.(id);
    }

    for (const figure of this.figures) {
      if (this.opts.fixedTimeSeconds !== undefined) figure.mixer.setTime(seconds);
      else figure.mixer.update(dt);
    }
    this.renderer.render(this.world, this.camera);
  }

  private setAnimation(figure: Figure, name: Figure["current"]): void {
    if (figure.current === name) return;
    figure.actions[name].reset().play();
    figure.actions[figure.current].crossFadeTo(figure.actions[name], 0.2, false);
    figure.current = name;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(pointer, this.camera);

    // A hotspot under the pointer wins; the nearest one if several overlap.
    let hit: { id: string; distance: number } | undefined;
    for (const hotspot of this.scene.hotspots) {
      const sphere = new THREE.Sphere(new THREE.Vector3(...hotspot.position), hotspot.radius);
      const point = ray.ray.intersectSphere(sphere, new THREE.Vector3());
      if (!point) continue;
      const distance = point.distanceTo(ray.ray.origin);
      if (!hit || distance < hit.distance) hit = { id: hotspot.id, distance };
    }
    if (hit) {
      this.activateHotspot(hit.id);
      return;
    }

    // Otherwise walk to the path node nearest the place on the ground that was clicked.
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = ray.ray.intersectPlane(ground, new THREE.Vector3());
    if (point) this.walkTo(nearestNode(this.scene.walk, [point.x, point.y, point.z]));
  };
}
