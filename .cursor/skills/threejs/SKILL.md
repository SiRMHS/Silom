---
name: threejs
description: Three.js WebGL development — scene setup, geometry, materials, lighting, textures, animation, loaders, interaction, post-processing, and GLSL shaders. Use when building 3D scenes, working with Three.js, WebGLRenderer, meshes, cameras, GLTF models, OrbitControls, raycasting, or EffectComposer.
---

# Three.js Skills

Modular Three.js reference skills. **Read the relevant sub-skill before writing code** — do not guess APIs.

## WebGPU / TSL projects

If the project uses `three/webgpu`, TSL node materials, or compute shaders, use the **webgpu-threejs-tsl** skill instead of the WebGL-focused skills below.

## Sub-skill routing

| Task | Read this skill |
|------|-----------------|
| Scene, camera, renderer, Object3D, transforms, math utils | [threejs-fundamentals](../threejs-fundamentals/SKILL.md) |
| Shapes, BufferGeometry, instancing, custom meshes | [threejs-geometry](../threejs-geometry/SKILL.md) |
| PBR, Phong, ShaderMaterial, material properties | [threejs-materials](../threejs-materials/SKILL.md) |
| Light types, shadows, IBL, environment maps | [threejs-lighting](../threejs-lighting/SKILL.md) |
| Texture loading, UVs, cubemaps, HDR, render targets | [threejs-textures](../threejs-textures/SKILL.md) |
| Keyframe animation, GLTF clips, morph targets, blending | [threejs-animation](../threejs-animation/SKILL.md) |
| GLTF, TextureLoader, LoadingManager, async loading | [threejs-loaders](../threejs-loaders/SKILL.md) |
| Raycasting, OrbitControls, mouse/touch input | [threejs-interaction](../threejs-interaction/SKILL.md) |
| EffectComposer, bloom, DOF, screen effects | [threejs-postprocessing](../threejs-postprocessing/SKILL.md) |
| GLSL, ShaderMaterial, uniforms, custom effects | [threejs-shaders](../threejs-shaders/SKILL.md) |

## Workflow

1. Identify the domain from the task (e.g. "add shadows" → lighting, "load GLB" → loaders).
2. Read the matching sub-skill file listed above.
3. For cross-cutting tasks, read multiple sub-skills (e.g. textured PBR mesh → geometry + materials + textures).
4. Follow existing project conventions for imports (`three` vs `three/addons` vs `three/examples/jsm`).

## Import paths

```javascript
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// Legacy path (still common in docs):
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
```

## Common starting pattern

```javascript
import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  // update...
  renderer.render(scene, camera);
}
animate();
```

## Cleanup checklist

Always dispose GPU resources when removing objects:

```javascript
geometry.dispose();
material.dispose(); // and material.map?.dispose() for textures
renderer.dispose();
```
