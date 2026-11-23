// The set for the scene "the water's edge". Metres, Y up. The camera looks from +Z towards -Z,
// so x runs left to right across the picture and smaller z is further away.
import type { Document } from "@gltf-transform/core";
import { ModelDoc } from "./doc";
import { box, type Geometry, groundPolygon, merge, type Point2, prism, seeded, strip } from "./shapes";

/** A rank of reeds: thin spikes in clumps, as one flat cut-out. */
function reeds(z: number, clumps: { x: number; width: number; count: number; height: number }[], seed: number): Geometry {
  const next = seeded(seed);
  const spikes: Geometry[] = [];
  for (const clump of clumps) {
    for (let i = 0; i < clump.count; i++) {
      const x = clump.x + (next() - 0.5) * clump.width;
      const height = clump.height * (0.55 + next() * 0.45);
      const half = 0.03 + next() * 0.035;
      const lean = (next() - 0.5) * 0.35;
      const positions = [x - half, -0.2, z, x + half, -0.2, z, x + lean, height, z];
      spikes.push({ positions, indices: [0, 1, 2] });
    }
  }
  return merge(...spikes);
}

/** A long low skyline made from a few overlapping waves, as one flat cut-out. */
function skyline(z: number, from: number, to: number, base: number, waves: [number, number, number][]): Geometry {
  const profile: Point2[] = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const x = from + ((to - from) * i) / steps;
    let y = base;
    for (const [height, length, phase] of waves) y += height * (0.5 + 0.5 * Math.sin((x / length) * Math.PI * 2 + phase));
    profile.push([x, y]);
  }
  return strip(profile, -1, z);
}

export function buildWatersEdge(): Document {
  const m = new ModelDoc("waters-edge");
  const add = (...args: Parameters<ModelDoc["node"]>) => m.scene.addChild(m.node(...args));

  // The bank the figures walk on, and the water behind it.
  add("ground", [{ role: "ground", geometry: box([80, 0.5, 21], [0, -0.25, 9.5]) }]);
  add("water", [
    {
      role: "water",
      geometry: groundPolygon(
        [
          [-80, -1],
          [80, -1],
          [80, -60],
          [-80, -60],
        ],
        -0.12,
      ),
    },
  ]);

  // The post that carries the culture's mark. 2.2 m tall, 0.3 m square, at x = -2, z = 0.
  add("post", [{ role: "structure", geometry: box([0.3, 2.2, 0.3], [-2, 1.1, 0]) }]);
  // Its shadow, a long flat shape thrown towards the viewer by a low sun behind and to the left.
  add("post-shadow", [
    {
      role: "shadow",
      geometry: groundPolygon(
        [
          [-2.15, 0.15],
          [-1.85, 0.15],
          [-0.2, 2.6],
          [-0.75, 2.6],
        ],
        0.012,
      ),
    },
  ]);

  // A jetty running back into the water from x = 5.
  const jettyPosts: Geometry[] = [];
  for (const z of [-1.6, -3.6, -5.6, -7.4]) {
    for (const x of [4.45, 5.55]) jettyPosts.push(box([0.14, 1.5, 0.14], [x, -0.1, z]));
  }
  add("jetty", [
    { role: "structure", geometry: merge(box([1.3, 0.1, 6.8], [5, 0.42, -4.2]), ...jettyPosts) },
  ]);

  // A hut on stilts, gable towards the viewer, read as a silhouette.
  const HUT_X = 7.7;
  const hutZ = -3;
  const stilts = [-1.3, 1.3].flatMap((dx) => [-0.9, 0.9].map((dz) => box([0.14, 0.9, 0.14], [HUT_X + dx, 0.45, hutZ + dz])));
  add("hut", [
    {
      role: "structure",
      geometry: merge(
        box([3.0, 1.7, 2.2], [HUT_X, 1.75, hutZ]),
        prism(
          [
            [HUT_X - 1.9, 2.6],
            [HUT_X + 1.9, 2.6],
            [HUT_X, 4.0],
          ],
          2.6,
          hutZ,
        ),
        ...stilts,
      ),
    },
  ]);

  // Three ranks of cut-outs. The scene's fog fades each rank further, which is where the depth comes from.
  add("rank-near", [
    {
      role: "structure",
      geometry: reeds(
        -4,
        [
          { x: -10.5, width: 3.2, count: 26, height: 2.1 },
          { x: -5.6, width: 1.6, count: 12, height: 1.5 },
          { x: 1.2, width: 2.2, count: 16, height: 1.3 },
          { x: 12.6, width: 3.0, count: 22, height: 2.0 },
        ],
        7,
      ),
    },
  ]);
  add("rank-mid", [
    {
      role: "structure",
      geometry: skyline(-9, -40, 40, 0.1, [
        [1.5, 17, 0.6],
        [0.7, 6.5, 2.1],
        [0.3, 2.3, 4.0],
      ]),
    },
  ]);
  add("rank-far", [
    {
      role: "structure",
      geometry: skyline(-16, -60, 60, 0.6, [
        [3.4, 41, 2.4],
        [1.4, 15, 0.4],
        [0.5, 5.5, 1.2],
      ]),
    },
  ]);

  return m.doc;
}
