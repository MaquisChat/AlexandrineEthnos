// The camera's slow drift along its rail. No rendering here.
import type { Scene, Vec3 } from "@fieldwork/contracts";

type Rail = Scene["camera"]["rail"];

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * Where the camera is and what it looks at, `seconds` after the scene opened.
 * It travels from the first keyframe to the last in `driftSeconds`, then back, easing at each end.
 */
export function railPose(rail: Rail, seconds: number, driftSeconds: number): { position: Vec3; lookAt: Vec3 } {
  const first = rail[0]!;
  if (rail.length === 1) return { position: [...first.position], lookAt: [...first.lookAt] };

  const cycle = (((seconds / driftSeconds) % 2) + 2) % 2; // 0..2
  const there = cycle <= 1 ? cycle : 2 - cycle; // out and back
  const eased = there * there * (3 - 2 * there);

  const along = eased * (rail.length - 1);
  const index = Math.min(Math.floor(along), rail.length - 2);
  const from = rail[index]!;
  const to = rail[index + 1]!;
  const t = along - index;
  return { position: lerp(from.position, to.position, t), lookAt: lerp(from.lookAt, to.lookAt, t) };
}
