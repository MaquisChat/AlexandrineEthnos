// Helpers that turn geometry into glTF nodes with unlit, role-named materials.
import { PALETTE_ROLES, type PaletteRole, type Vec3 } from "@fieldwork/contracts";
import { type Buffer as GltfBuffer, Document, type Material, type Node } from "@gltf-transform/core";
import { KHRMaterialsUnlit } from "@gltf-transform/extensions";
import type { Geometry } from "./shapes";

// Placeholder colours so a file looks sensible when opened on its own.
// The game recolours every material from the scene's palette, by role.
const PLACEHOLDER: Record<PaletteRole, string> = {
  sky: "#f2c9a0",
  fog: "#e9b98f",
  ground: "#3b2f3a",
  water: "#6f7f95",
  structure: "#241c26",
  figure: "#141018",
  accent: "#d9502f",
  shadow: "#1b1520",
  mark: "#f4ead7",
};

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export class ModelDoc {
  readonly doc = new Document();
  readonly scene;
  private readonly buffer: GltfBuffer;
  private readonly unlit;
  private readonly materials = new Map<PaletteRole, Material>();

  constructor(name: string) {
    this.doc.getRoot().getAsset().generator = "fieldwork make-models";
    this.buffer = this.doc.createBuffer();
    this.unlit = this.doc.createExtension(KHRMaterialsUnlit);
    this.scene = this.doc.createScene(name);
    this.doc.getRoot().setDefaultScene(this.scene);
  }

  material(role: PaletteRole): Material {
    if (!PALETTE_ROLES.includes(role)) throw new Error(`unknown palette role: ${role}`);
    let material = this.materials.get(role);
    if (!material) {
      const hex = PLACEHOLDER[role];
      const rgb = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
      material = this.doc
        .createMaterial(`role:${role}`)
        .setBaseColorFactor([rgb[0]!, rgb[1]!, rgb[2]!, 1])
        .setDoubleSided(true)
        .setExtension("KHR_materials_unlit", this.unlit.createUnlit());
      this.materials.set(role, material);
    }
    return material;
  }

  /** A node with one mesh; each part of the mesh has its own role. */
  node(name: string, parts: { role: PaletteRole; geometry: Geometry }[], translation: Vec3 = [0, 0, 0]): Node {
    const node = this.doc.createNode(name).setTranslation(translation);
    if (parts.length > 0) {
      const mesh = this.doc.createMesh(name);
      for (const part of parts) {
        const position = this.doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(part.geometry.positions))
          .setBuffer(this.buffer);
        const indices = this.doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint16Array(part.geometry.indices))
          .setBuffer(this.buffer);
        mesh.addPrimitive(
          this.doc.createPrimitive().setAttribute("POSITION", position).setIndices(indices).setMaterial(this.material(part.role)),
        );
      }
      node.setMesh(mesh);
    }
    return node;
  }

  /** Adds a looping rotation track for one node. `degrees` are angles about `axis` at each time. */
  rotationTrack(animationName: string, node: Node, axis: "x" | "y" | "z", times: number[], degrees: number[]): void {
    const root = this.doc.getRoot();
    const animation =
      root.listAnimations().find((a) => a.getName() === animationName) ?? this.doc.createAnimation(animationName);
    const values = degrees.flatMap((d) => {
      const half = (d * Math.PI) / 360;
      const s = Math.sin(half);
      return [axis === "x" ? s : 0, axis === "y" ? s : 0, axis === "z" ? s : 0, Math.cos(half)];
    });
    const input = this.doc.createAccessor().setType("SCALAR").setArray(new Float32Array(times)).setBuffer(this.buffer);
    const output = this.doc.createAccessor().setType("VEC4").setArray(new Float32Array(values)).setBuffer(this.buffer);
    const sampler = this.doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation("LINEAR");
    const channel = this.doc.createAnimationChannel().setTargetNode(node).setTargetPath("rotation").setSampler(sampler);
    animation.addSampler(sampler).addChannel(channel);
  }
}
