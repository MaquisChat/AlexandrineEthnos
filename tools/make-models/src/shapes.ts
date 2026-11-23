// Small builders for flat-colour geometry. No normals and no texture coordinates:
// every material is unlit, so only positions and triangles matter.
import type { Vec3 } from "@fieldwork/contracts";

export interface Geometry {
  positions: number[];
  indices: number[];
}

export type Point2 = [number, number];

export function merge(...parts: Geometry[]): Geometry {
  const out: Geometry = { positions: [], indices: [] };
  for (const part of parts) {
    const offset = out.positions.length / 3;
    out.positions.push(...part.positions);
    out.indices.push(...part.indices.map((i) => i + offset));
  }
  return out;
}

/** An axis-aligned box. */
export function box(size: Vec3, center: Vec3): Geometry {
  const [hx, hy, hz] = [size[0] / 2, size[1] / 2, size[2] / 2];
  const [cx, cy, cz] = center;
  const positions: number[] = [];
  for (const sz of [-1, 1]) for (const sy of [-1, 1]) for (const sx of [-1, 1]) positions.push(cx + sx * hx, cy + sy * hy, cz + sz * hz);
  // Corner index = x + 2y + 4z, each 0 or 1.
  const quads = [
    [0, 2, 3, 1], // back
    [4, 5, 7, 6], // front
    [0, 1, 5, 4], // bottom
    [2, 6, 7, 3], // top
    [0, 4, 6, 2], // left
    [1, 3, 7, 5], // right
  ];
  const indices = quads.flatMap(([a, b, c, d]) => [a!, b!, c!, a!, c!, d!]);
  return { positions, indices };
}

/** A flat convex polygon in the XY plane at depth z. */
export function fan(outline: Point2[], z: number): Geometry {
  const positions = outline.flatMap(([x, y]) => [x, y, z]);
  const indices: number[] = [];
  for (let i = 1; i < outline.length - 1; i++) indices.push(0, i, i + 1);
  return { positions, indices };
}

/** A convex outline in the XY plane, given a thickness along Z. */
export function prism(outline: Point2[], depth: number, centerZ: number): Geometry {
  const n = outline.length;
  const front = fan(outline, centerZ + depth / 2);
  const back = fan(outline, centerZ - depth / 2);
  const sides: Geometry = { positions: [...front.positions, ...back.positions], indices: [] };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sides.indices.push(i, j, n + j, i, n + j, n + i);
  }
  return merge(front, back, sides);
}

/** A flat cut-out filling the space between a profile line and a base height, in the XY plane at depth z. */
export function strip(profile: Point2[], baseY: number, z: number): Geometry {
  const positions: number[] = [];
  const indices: number[] = [];
  profile.forEach(([x, y], i) => {
    positions.push(x, y, z, x, baseY, z);
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  });
  return { positions, indices };
}

/** A flat convex polygon lying on the ground (the XZ plane) at height y. */
export function groundPolygon(points: Point2[], y: number): Geometry {
  const positions = points.flatMap(([x, z]) => [x, y, z]);
  const indices: number[] = [];
  for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
  return { positions, indices };
}

/** A flat ellipse lying on the ground. */
export function groundEllipse(center: Vec3, rx: number, rz: number, segments = 24): Geometry {
  const points: Point2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push([center[0] + Math.cos(a) * rx, center[2] + Math.sin(a) * rz]);
  }
  return groundPolygon(points, center[1]);
}

/** A regular polygon outline, first corner at the top. */
export function regular(sides: number, radius: number, center: Point2): Point2[] {
  const out: Point2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = Math.PI / 2 + (i / sides) * Math.PI * 2;
    out.push([center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius]);
  }
  return out;
}

/** A repeatable stream of numbers in [0, 1). Model files must come out the same on every run. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
