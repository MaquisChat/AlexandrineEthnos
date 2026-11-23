// The figure every person in the game is built on: rigid parts on a fixed set of named joints,
// like a jointed model-theatre puppet. No skinning. Feet at y = 0, facing +Z.
import { FIGURE_HEIGHT_M } from "@fieldwork/contracts";
import type { Document } from "@gltf-transform/core";
import { ModelDoc } from "./doc";
import { box, groundEllipse, prism, regular } from "./shapes";

// Heights in metres. They must add up to FIGURE_HEIGHT_M (checked below).
const LEG = 0.86;
const HIPS = 0.12;
const TORSO = 0.46;
const NECK = 0.04;
const HEAD_RADIUS = 0.11;

export function buildFigure(): Document {
  const top = LEG + HIPS + TORSO + NECK + HEAD_RADIUS * 2;
  if (Math.abs(top - FIGURE_HEIGHT_M) > 1e-9) throw new Error(`figure parts add up to ${top}, not ${FIGURE_HEIGHT_M}`);

  const m = new ModelDoc("figure");

  const root = m.node("root", []);
  // A flat round shadow that travels with the figure. Round, so it looks right whichever way the figure faces.
  const shadow = m.node("shadow", [{ role: "shadow", geometry: groundEllipse([0, 0.01, 0], 0.34, 0.34) }]);

  const hips = m.node("hips", [{ role: "figure", geometry: box([0.3, HIPS, 0.2], [0, HIPS / 2, 0]) }], [0, LEG, 0]);

  // The torso widens to the shoulders. A band of the accent colour crosses it.
  const torso = m.node(
    "torso",
    [
      {
        role: "figure",
        geometry: prism(
          [
            [-0.15, 0],
            [0.15, 0],
            [0.2, TORSO],
            [-0.2, TORSO],
          ],
          0.22,
          0,
        ),
      },
      { role: "accent", geometry: box([0.38, 0.07, 0.24], [0, 0.2, 0]) },
    ],
    [0, HIPS, 0],
  );

  const head = m.node(
    "head",
    [{ role: "figure", geometry: prism(regular(8, HEAD_RADIUS, [0, HEAD_RADIUS]), 0.2, 0) }],
    [0, TORSO + NECK, 0],
  );

  const arm = (name: string, side: number) =>
    m.node(name, [{ role: "figure", geometry: box([0.08, 0.62, 0.1], [0, -0.31, 0]) }], [side * 0.25, TORSO - 0.02, 0]);
  const leg = (name: string, side: number) =>
    m.node(name, [{ role: "figure", geometry: box([0.12, LEG, 0.13], [0, -LEG / 2, 0]) }], [side * 0.09, 0, 0]);
  const armL = arm("arm_l", 1);
  const armR = arm("arm_r", -1);
  const legL = leg("leg_l", 1);
  const legR = leg("leg_r", -1);

  m.scene.addChild(root);
  root.addChild(shadow).addChild(hips);
  hips.addChild(torso).addChild(legL).addChild(legR);
  torso.addChild(head).addChild(armL).addChild(armR);

  // Walk: one second per cycle. Legs scissor; each arm swings with the opposite leg.
  const walkTimes = [0, 0.25, 0.5, 0.75, 1];
  const swing = (a: number) => [a, 0, -a, 0, a];
  m.rotationTrack("walk", legL, "x", walkTimes, swing(26));
  m.rotationTrack("walk", legR, "x", walkTimes, swing(-26));
  m.rotationTrack("walk", armL, "x", walkTimes, swing(-18));
  m.rotationTrack("walk", armR, "x", walkTimes, swing(18));
  m.rotationTrack("walk", torso, "x", walkTimes, [4, 4, 4, 4, 4]);

  // Idle: two seconds per cycle. A slow sway, barely there.
  const idleTimes = [0, 1, 2];
  m.rotationTrack("idle", torso, "z", idleTimes, [-1.2, 1.2, -1.2]);
  m.rotationTrack("idle", head, "z", idleTimes, [1.5, -1.5, 1.5]);
  m.rotationTrack("idle", armL, "x", idleTimes, [-2, 2, -2]);
  m.rotationTrack("idle", armR, "x", idleTimes, [2, -2, 2]);

  return m.doc;
}
