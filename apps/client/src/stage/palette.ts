import { PALETTE_ROLES, type PaletteRole, type Scene } from "@fieldwork/contracts";
import type * as THREE from "three";

const ROLE_PREFIX = "role:";

/**
 * Recolours every material named "role:<role>" from the scene's palette.
 * Model files carry roles, not colours, so one set of models serves every culture.
 */
export function applyPalette(root: THREE.Object3D, palette: Scene["palette"]): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material.name.startsWith(ROLE_PREFIX)) continue;
      const role = material.name.slice(ROLE_PREFIX.length) as PaletteRole;
      if (!PALETTE_ROLES.includes(role)) {
        throw new Error(`Material "${material.name}" has a role that is not in the palette.`);
      }
      (material as THREE.MeshBasicMaterial).color.set(palette[role]);
    }
  });
}
