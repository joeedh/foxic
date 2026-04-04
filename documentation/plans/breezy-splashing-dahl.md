# Refactor WebGLRenderer to New WebGL API

## Context

`WebGLRenderer` uses a hand-rolled ubershader with manual VAO/VBO/EBO management
and a flat `Float32Array` batch buffer. The new `src/rendering/WebGL/` API provides
strongly-typed `ShaderProgramBase`, `GPUDrawElements`, and `VertexArray` classes.
The goal is to replace the manual GL plumbing with the new API, split the
ubershader into two focused shaders, and eliminate the generic/untyped WebGL code —
while keeping the same public API so no callers need to change.

---

## Critical Files

- **`src/rendering/WebGLRenderer.ts`** — the only file that changes
- `src/rendering/WebGL/shaderprogram.ts` — `ShaderProgramBase`, `IShaderDef`, `GLType`
- `src/rendering/WebGL/gpuDrawElements.ts` — `GPUDrawElements`
- `src/rendering/WebGL/vertexArray.ts` — `VertexArray`, `VertexArrayTarget`
- `src/rendering/WebGL/texture.ts` — `Texture` (only needed for bakeChromaKey)

---

## Design

### Two Shaders

```typescript
const spriteDef = {
  vertexSource: SPRITE_VERT,
  fragmentSource: SPRITE_FRAG,
  uniforms: {
    uResolution: { type: GLType.Vec2, default: [0, 0] as [number, number] },
    uOffset:     { type: GLType.Vec2, default: [0, 0] as [number, number] },
    uTexture:    { type: GLType.Sampler2D, default: 0 },
  },
  attrs: {
    aPosition: { type: AttrType.Vec2,  size: 2 },
    aTexCoord: { type: AttrType.Vec2,  size: 2 },
    aColor:    { type: AttrType.Vec4,  size: 4 },
    aIndices:  { type: AttrType.UShort, size: 1,
                 target: VertexArrayTarget.ElementArrayBuffer },
  },
} satisfies IShaderDef

const chromakeyDef = {
  vertexSource: CK_VERT,
  fragmentSource: CK_FRAG,
  uniforms: {
    uResolution: { type: GLType.Vec2, default: [0, 0] as [number, number] },
    uTexture:    { type: GLType.Sampler2D, default: 0 },
  },
  attrs: {
    aPosition: { type: AttrType.Vec2,  size: 2 },
    aTexCoord: { type: AttrType.Vec2,  size: 2 },
    aIndices:  { type: AttrType.UShort, size: 1,
                 target: VertexArrayTarget.ElementArrayBuffer },
  },
} satisfies IShaderDef
```

**Sprite shader** (`sprite`):
- Vertex: `aPosition`, `aTexCoord`, `aColor`; uniforms `uResolution`, `uOffset`, `uTexture`
- Fragment: `texture() * vColor` — no chroma key branch
- The `aChromaKey` float attribute is removed; `drawSprite()` still accepts the
  `chromaKey` param for API compatibility but ignores it (chroma key is baked at
  load time via `bakeChromaKey()`)

**Chroma key shader** (`chromakey`):
- Only used inside `bakeChromaKey()`
- Fragment: magenta → alpha via `smoothstep` (same logic as old shader branch)
- No `uOffset` needed (renders to offscreen FBO at pixel coordinates)
- No color tinting needed

```typescript
const Shaders = {
  sprite: new ShaderProgramBase(gl, spriteDef),
  chromakey: new ShaderProgramBase(gl, chromakeyDef),
}
```

### GPUDrawElements — Sprite Batch

```typescript
const batch = new GPUDrawElements(spriteDef.attrs, INDICES_PER_QUAD)
```

Pre-allocate for `MAX_QUADS = 4000` quads once in constructor:
1. `batch.growElements(MAX_QUADS)` — allocates index + vertex arrays
2. Pre-fill the index array once (`aIndices` typed array) with the standard
   quad pattern (0,1,2, 1,3,2 for each quad)
3. Flag the index array as fully updated: `batch.vertexData.aIndices.flagRangeUpdated(0, MAX_QUADS * 6)`

Each frame, vertex data is written directly into the typed arrays:
```typescript
const pos  = batch.getArray('aPosition') // Float32Array
const uv   = batch.getArray('aTexCoord') // Float32Array
const col  = batch.getArray('aColor')    // Float32Array
```

`quadCount` tracks how many quads are pending in the current batch. On `flush()`:
- Set `batch.lastElement = quadCount`
- Flag dirty ranges on position/uv/color arrays
- Call `batch.bind(gl, Shaders.sprite, { uResolution, uOffset, uTexture: currentTexSlot })`
- Reset `quadCount = 0`

> Note: `GPUDrawElements.bind()` does not use a VAO — it sets up
> `vertexAttribPointer` on the default VAO (VAO 0) each draw call.
> Remove the old `this.vao` bind/unbind in `begin()`/`end()`.

### Render Target / Resolution Tracking

Track `currentResolution: [number, number]` and `currentOffset: [number, number]`
as private fields (updated by `setOffset()` and `pushRenderTarget()`/`popRenderTarget()`).
Pass them as uniforms in the `flush()` call to `batch.bind()`.

### bakeChromaKey — Chroma Batch

Use a separate small `GPUDrawElements` for the chroma key bake — just 1 quad:
```typescript
const chromaBatch = new GPUDrawElements(chromakeyDef.attrs, INDICES_PER_QUAD)
chromaBatch.growElements(1)
// fill one quad, fill index buffer
chromaBatch.bind(gl, Shaders.chromakey, { uResolution: [w, h], uTexture: 0 })
```

### Private Fields After Refactor

Remove: `program`, `vao`, `vbo`, `ebo`, `buffer`, `uResolution`, `uOffset`, `uTexture`

Add:
```typescript
private shaders: {
  sprite: ShaderProgramBase<typeof spriteDef>
  chromakey: ShaderProgramBase<typeof chromakeyDef>
}
private batch: GPUDrawElements<typeof spriteDef['attrs']>
private quadCount = 0
private currentResolution: [number, number]
private currentOffset: [number, number] = [0, 0]
private currentTexture: WebGLTexture | undefined = undefined
```

Keep: `whiteTexture`, `bgColor`, `logicalWidth`, `logicalHeight`,
`renderTargetStack`, `_stats`, `canvas`, `gl`

Change `currentTexture` from `null` to `undefined` per project conventions.

---

## Implementation Steps

1. **Add imports** at top of `WebGLRenderer.ts`:
   ```typescript
   import { ShaderProgramBase, GLType, AttrType, type IShaderDef }
     from './WebGL/shaderprogram'
   import { GPUDrawElements } from './WebGL/gpuDrawElements'
   import { VertexArrayTarget } from './WebGL/vertexArray'
   ```

2. **Define GLSL sources** — replace `VERT_SRC` / `FRAG_SRC` with four consts:
   `SPRITE_VERT`, `SPRITE_FRAG`, `CK_VERT`, `CK_FRAG`

3. **Define `spriteDef` and `chromakeyDef`** as module-level consts with
   `satisfies IShaderDef`

4. **Rewrite constructor**:
   - Keep canvas/gl creation, blending, viewport
   - Remove `createProgram()` call, VAO/VBO/EBO setup, uniform location caching
   - Create `Shaders` object and `batch` / `chromaBatch` `GPUDrawElements`
   - Pre-allocate and pre-fill index buffers
   - Keep `whiteTexture` creation (same logic)

5. **Rewrite `flush()`**:
   - Set `batch.lastElement = quadCount`
   - `flagRangeUpdated` on position, uv, color arrays
   - Call `batch.bind(gl, Shaders.sprite, { uResolution, uOffset, uTexture: 0 })`
   - Reset `quadCount = 0`

6. **Update `pushQuad()`** — write directly to typed arrays instead of
   `this.buffer`; use `quadCount * VERTS_PER_QUAD * STRIDE` offsets

7. **Update `setOffset()`** — store into `currentOffset`, no more `gl.uniform2f`

8. **Update `pushRenderTarget()` / `popRenderTarget()`** — update
   `currentResolution` instead of calling `gl.uniform2f(uResolution, ...)`

9. **Rewrite `bakeChromaKey()`** — use `chromaBatch` with `Shaders.chromakey`

10. **Remove** `createProgram()` private method (now handled by `ShaderProgramBase`)

11. **Keep unchanged**: `loadTexture()`, `createTextureFromCanvas()`,
    `updateTextureFromCanvas()`, `deleteTexture()`, `createRenderTarget()`,
    `begin()` (except remove `gl.useProgram` / `gl.bindVertexArray` calls),
    `end()` (except remove `gl.bindVertexArray(null)`), `bindTexture()`,
    `drawSprite()`, `drawFrame()`, `drawRect()`
12. Read contents of src/renderer folder and check it for consistency and errors.
13. Review the architectural design of the renderer and suggest at most 5 refactors.

---

## Verification

1. `pnpm typecheck` — zero TypeScript errors
2. `pnpm dev` — launch game, verify:
   - Sprites render correctly (player, enemies, rings)
   - Color tinting works (HUD elements)
   - Parallax background renders
   - `bakeChromaKey` works (magenta removed from sprite sheets)
   - Camera offset / scrolling works
   - Render-to-texture (FBO) works if used
3. `pnpm playwright` — all existing Playwright tests pass
