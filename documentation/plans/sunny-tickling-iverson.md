# Finish Texture class implementation

## Context

The `Texture` class at `src/rendering/WebGL/texture.ts` has three
stub methods (`uploadBuffer`, `uploadMedia`, `bind`) that need
implementation. This class is already used by `ShaderProgramBase`
in `shaderprogram.ts` (line 240) for sampler uniform binding.

## Approach

Follow the same context-loss pattern used by `VertexArray` in
`vertexArray.ts`: track which `gl` instance last created the
GPU resource and recreate it when the context changes.

### Changes to `src/rendering/WebGL/texture.ts`

1. **Make `texture` mutable** — change `readonly texture` to a
   private `glTexture` field (+ track `textureGL` context ref).
   Expose a getter so `shaderprogram.ts` still compiles.

2. **Add private helper `ensureTexture(gl)`** — if `gl` differs
   from `textureGL` or `glTexture` is undefined, call
   `gl.createTexture()` and reset upload state. This mirrors
   `VertexArray.bind()` lines 136-139.

3. **Implement `uploadBuffer`**:
   - Call `ensureTexture(gl)`
   - Bind texture to `TEXTURE_2D`
   - Determine `internalFormat` / `format` from `type`:
     - `UNSIGNED_BYTE` → `RGBA` / `RGBA`
     - `FLOAT` → `RGBA32F` / `RGBA`
   - `gl.texImage2D(TEXTURE_2D, 0, internalFormat, width, height,
     0, format, type, data)`
   - Set default filter/wrap (NEAREST, CLAMP_TO_EDGE)
   - Update `width`/`height`

4. **Implement `uploadMedia`**:
   - Call `ensureTexture(gl)`
   - Bind texture to `TEXTURE_2D`
   - `gl.texImage2D(TEXTURE_2D, 0, RGBA, RGBA, UNSIGNED_BYTE,
     media)`
   - Set default filter/wrap (NEAREST, CLAMP_TO_EDGE)
   - Update `width`/`height` from media dimensions

5. **Implement `bind`**:
   - Call `ensureTexture(gl)`
   - Keep existing `activeTexture` + `bindTexture` lines

6. **Make `width`/`height` mutable** (remove `readonly`) so
   upload methods can update them.

### Files to modify

- `src/rendering/WebGL/texture.ts` — all changes here

### No other files need changes

`shaderprogram.ts` accesses `texture.bind(gl, slot)` which stays
the same. The `texture` property is only used internally.

## Verification

1. `pnpm typecheck` — ensure no type errors
2. `pnpm build` — ensure production build succeeds
3. `pnpm format` — ensure formatting is correct
4.  Read entire contents of src\rendering\WebGL folder and check for inconsistencies, bugs, serious issues, etc


