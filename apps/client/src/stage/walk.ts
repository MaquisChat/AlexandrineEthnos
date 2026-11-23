// Where a figure can walk in a scene, and how it gets there. No rendering here.
import type { Scene, Vec3 } from "@fieldwork/contracts";

type Walk = Scene["walk"];

const distance = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

function positions(walk: Walk): Map<string, Vec3> {
  return new Map(walk.nodes.map((n) => [n.id, n.position]));
}

/** Distances from one node to every node it can reach, and the step before each on the shortest way there. */
function shortestFrom(walk: Walk, from: string) {
  const at = positions(walk);
  const cost = new Map<string, number>([[from, 0]]);
  const previous = new Map<string, string>();
  const open = new Set<string>([from]);
  const done = new Set<string>();

  while (open.size > 0) {
    let current: string | undefined;
    for (const id of open) if (current === undefined || cost.get(id)! < cost.get(current)!) current = id;
    open.delete(current!);
    done.add(current!);

    for (const [a, b] of walk.edges) {
      const next = a === current ? b : b === current ? a : undefined;
      if (next === undefined || done.has(next) || !at.has(next)) continue;
      const total = cost.get(current!)! + distance(at.get(current!)!, at.get(next)!);
      if (total < (cost.get(next) ?? Infinity)) {
        cost.set(next, total);
        previous.set(next, current!);
        open.add(next);
      }
    }
  }
  return { cost, previous };
}

function route(walk: Walk, from: string, to: string): { path: string[]; length: number } | null {
  const at = positions(walk);
  if (!at.has(from) || !at.has(to)) return null;
  const { cost, previous } = shortestFrom(walk, from);
  const length = cost.get(to);
  if (length === undefined) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(previous.get(path[0]!)!);
  return { path, length };
}

/** The shortest way along the walk's edges, by distance. Null if there is no way, or either node is unknown. */
export function shortestPath(walk: Walk, from: string, to: string): string[] | null {
  return route(walk, from, to)?.path ?? null;
}

/** The walk node closest to a point. */
export function nearestNode(walk: Walk, point: Vec3): string {
  let best = walk.nodes[0]!;
  for (const node of walk.nodes) if (distance(node.position, point) < distance(best.position, point)) best = node;
  return best.id;
}

export interface WalkerState {
  position: Vec3;
  /** Angle about Y of the direction of travel: 0 faces +Z, a quarter turn faces +X. Kept when standing. */
  headingRad: number;
  moving: boolean;
}

/** A figure walking the scene's paths at a steady speed. */
export class Walker {
  private readonly walk: Walk;
  private readonly at: Map<string, Vec3>;
  private readonly speed: number;
  private position: Vec3;
  private heading = 0;
  /** The node last stood on or passed. */
  private behind: string;
  /** Nodes still to visit, in order. */
  private ahead: string[] = [];
  private standingOn: string | null;

  constructor(walk: Walk, speedMps = 1.2) {
    this.walk = walk;
    this.at = positions(walk);
    this.speed = speedMps;
    this.behind = walk.start;
    this.standingOn = walk.start;
    this.position = [...this.at.get(walk.start)!];
  }

  /** The node the figure stands on, or null while it is between nodes. */
  get atNode(): string | null {
    return this.standingOn;
  }

  /**
   * Sets a new goal. Mid-walk, the figure may head for either end of the edge it is on,
   * whichever gives the shorter way, so it can turn back at once.
   * Returns false, changing nothing, if the node is unknown or cannot be reached.
   */
  goTo(nodeId: string): boolean {
    if (!this.at.has(nodeId)) return false;

    if (this.standingOn !== null) {
      const found = route(this.walk, this.standingOn, nodeId);
      if (!found) return false;
      this.ahead = found.path.slice(1);
      return true;
    }

    // Between two nodes: try both ends of the current edge.
    const ends = [this.behind, this.ahead[0]!];
    let best: { first: string; path: string[]; total: number } | undefined;
    for (const end of ends) {
      const found = route(this.walk, end, nodeId);
      if (!found) continue;
      const total = distance(this.position, this.at.get(end)!) + found.length;
      if (!best || total < best.total) best = { first: end, path: found.path, total };
    }
    if (!best) return false;
    this.behind = ends.find((end) => end !== best.first) ?? this.behind;
    this.ahead = best.path;
    return true;
  }

  update(dtSeconds: number): WalkerState {
    let budget = this.speed * Math.max(0, dtSeconds);
    while (budget > 0 && this.ahead.length > 0) {
      const next = this.ahead[0]!;
      const target = this.at.get(next)!;
      const gap = distance(this.position, target);
      if (gap > 0) this.heading = Math.atan2(target[0] - this.position[0], target[2] - this.position[2]);

      if (gap <= budget) {
        this.position = [...target];
        budget -= gap;
        this.behind = next;
        this.standingOn = next;
        this.ahead.shift();
      } else {
        const f = budget / gap;
        this.position = [
          this.position[0] + (target[0] - this.position[0]) * f,
          this.position[1] + (target[1] - this.position[1]) * f,
          this.position[2] + (target[2] - this.position[2]) * f,
        ];
        this.standingOn = null;
        budget = 0;
      }
    }
    return { position: [...this.position], headingRad: this.heading, moving: this.ahead.length > 0 };
  }
}
