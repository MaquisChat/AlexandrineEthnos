import type { Scene, Vec3 } from "@fieldwork/contracts";
import { expect, it } from "vitest";
import { nearestNode, shortestPath, Walker } from "../src/stage/walk";

const line: Scene["walk"] = {
  start: "a",
  edges: [
    ["a", "b"],
    ["b", "c"],
  ],
  nodes: [
    { id: "a", position: [0, 0, 0] },
    { id: "b", position: [3, 0, 0] },
    { id: "c", position: [6, 0, 0] },
    { id: "island", position: [0, 0, 9] },
  ],
};
const dist = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

it("finds the path along edges", () => expect(shortestPath(line, "a", "c")).toEqual(["a", "b", "c"]));
it("prefers the shorter of two routes", () => {
  const tri = {
    ...line,
    edges: [...line.edges, ["a", "c"]] as [string, string][],
    nodes: line.nodes.map((n) => (n.id === "b" ? { ...n, position: [3, 0, 8] as Vec3 } : n)),
  };
  expect(shortestPath(tri, "a", "c")).toEqual(["a", "c"]);
});
it("returns null for an unreachable node", () => expect(shortestPath(line, "a", "island")).toBeNull());
it("returns a one-node path to itself", () => expect(shortestPath(line, "b", "b")).toEqual(["b"]));
it("finds the nearest node to a point", () => expect(nearestNode(line, [5.2, 0, 0.4])).toBe("c"));

it("walks at its speed and arrives", () => {
  const w = new Walker(line, 1.2);
  expect(w.goTo("c")).toBe(true);
  expect(w.update(1).position[0]).toBeCloseTo(1.2, 5);
  let s = w.update(0);
  for (let i = 0; i < 100; i++) s = w.update(0.1);
  expect(s).toMatchObject({ position: [6, 0, 0], moving: false });
  expect(w.atNode).toBe("c");
});
it("faces the way it is going and keeps facing that way when it stops", () => {
  const w = new Walker(line, 1.2);
  w.goTo("b");
  expect(w.update(0.5).headingRad).toBeCloseTo(Math.PI / 2, 5); // +X is a quarter turn from +Z
  expect(w.update(60)).toMatchObject({ moving: false, headingRad: expect.closeTo(Math.PI / 2, 5) });
});
it("never teleports when told to turn back mid-walk", () => {
  const w = new Walker(line, 1.2);
  w.goTo("c");
  let last = w.update(1).position;
  w.goTo("a");
  for (let i = 0; i < 200; i++) {
    const p = w.update(0.05).position;
    expect(dist(p, last)).toBeLessThanOrEqual(1.2 * 0.05 + 1e-9);
    last = p;
  }
  expect(last).toEqual([0, 0, 0]);
});
it("turns back at once instead of finishing the edge", () => {
  const w = new Walker(line, 1.2);
  w.goTo("c");
  w.update(1); // at x = 1.2, heading for b
  w.goTo("a");
  expect(w.update(0.5).position[0]).toBeCloseTo(0.6, 5);
});
it("refuses a place it cannot reach and stays put", () => {
  const w = new Walker(line);
  expect(w.goTo("island")).toBe(false);
  expect(w.goTo("nowhere")).toBe(false);
  expect(w.update(1)).toMatchObject({ position: [0, 0, 0], moving: false });
});
it("keeps walking to its old goal when a new one is refused mid-walk", () => {
  const w = new Walker(line, 1.2);
  w.goTo("b");
  w.update(1);
  expect(w.goTo("island")).toBe(false);
  expect(w.update(60).position).toEqual([3, 0, 0]);
});
it("does not overshoot on a long frame", () => {
  const w = new Walker(line, 1.2);
  w.goTo("b");
  expect(w.update(60).position).toEqual([3, 0, 0]);
});
