import type { Vec3 } from "@fieldwork/contracts";
import { expect, it } from "vitest";
import { railPose } from "../src/stage/rail";

const rail = [
  { position: [0, 2, 15] as Vec3, lookAt: [0, 1, 0] as Vec3 },
  { position: [2, 2, 15] as Vec3, lookAt: [1, 1, 0] as Vec3 },
];
it("starts at the first keyframe", () => expect(railPose(rail, 0, 40).position).toEqual([0, 2, 15]));
it("reaches the last keyframe after driftSeconds", () => expect(railPose(rail, 40, 40).position[0]).toBeCloseTo(2, 5));
it("returns to the start after twice driftSeconds", () => expect(railPose(rail, 80, 40).position[0]).toBeCloseTo(0, 5));
it("eases: a quarter of the way in time is less than a quarter in distance", () =>
  expect(railPose(rail, 10, 40).position[0]).toBeLessThan(0.5));
it("moves the look-at point with the camera", () => expect(railPose(rail, 40, 40).lookAt[0]).toBeCloseTo(1, 5));
it("is constant with one keyframe", () => expect(railPose([rail[0]!], 123, 40)).toEqual(rail[0]));
it("passes through a middle keyframe halfway", () => {
  const three = [...rail, { position: [2, 4, 15] as Vec3, lookAt: [1, 1, 0] as Vec3 }];
  expect(railPose(three, 20, 40).position).toEqual([expect.closeTo(2, 5), expect.closeTo(2, 5), 15]);
});
