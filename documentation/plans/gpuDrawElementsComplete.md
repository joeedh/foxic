# Complete `GPUDrawElements.bind()` Implementation

## Context

The `bind` method in `src/rendering/WebGL/gpuDrawElements.ts:54` has a stub with `//implement me!`. It needs to bind vertex arrays to their shader attribute locations, bind any element array buffer, and issue the draw call.

## Problem

1. `ShaderProgramBase.attrLocations` is **private** — `GPUDrawElements.bind()` cannot access attribute locations from the shader.
2. `VertexArray.bind()` at `src/rendering/WebGL/vertexArray.ts:118` is also a stub — it needs to create/upload GPU buffers.

## Plan

### Step 1: Add public `getAttrLocation` to `ShaderProgramBase`

**File:** `src/rendering/WebGL/shaderprogram.ts`

Add a public method after the `bind` method (~line 292):

```ts
getAttrLocation(name: string): number {
  return this.attrLocations.get(name) ?? -1
}
```

Also add the same method to `ShaderWithMacros` so it delegates to the current macro shader. Since `Shader` is a union type of both, both need the method.

### Step 2: Implement `VertexArray.bind()`

**File:** `src/rendering/WebGL/vertexArray.ts`

The `bind` method needs to:
- Track a `WebGLBuffer` handle and the GL context it was created on
- On context change: recreate the buffer and re-upload all data
- On data change (flagged via `flagRangeUpdated`): re-upload the dirty range via `gl.bufferSubData`
- Bind the buffer to the appropriate target (`ARRAY_BUFFER` or `ELEMENT_ARRAY_BUFFER`)

Add fields:
```ts
private glBuffer: WebGLBuffer | undefined
private bufferGL: WebGL2RenderingContext | undefined
private dirtyStart = 0
private dirtyEnd = 0
private dirty = false
private uploaded = false
```

Implement `flagRangeUpdated`:
```ts
flagRangeUpdated(start: number, end: number) {
  if (!this.dirty) {
    this.dirtyStart = start
    this.dirtyEnd = end
    this.dirty = true
  } else {
    this.dirtyStart = Math.min(this.dirtyStart, start)
    this.dirtyEnd = Math.max(this.dirtyEnd, end)
  }
}
```

Update `growData` to flag dirty after growing.

Implement `bind`:
```ts
bind(gl: WebGL2RenderingContext) {
  if (gl !== this.bufferGL || this.glBuffer === undefined) {
    this.glBuffer = gl.createBuffer()!
    this.bufferGL = gl
    this.uploaded = false
  }

  gl.bindBuffer(this.target, this.glBuffer)

  if (!this.uploaded) {
    gl.bufferData(this.target, this.data, gl.DYNAMIC_DRAW)
    this.uploaded = true
    this.dirty = false
  } else if (this.dirty) {
    gl.bufferSubData(this.target, this.dirtyStart * this.data.BYTES_PER_ELEMENT, this.data, this.dirtyStart, this.dirtyEnd - this.dirtyStart)
    this.dirty = false
  }
}
```

Implement `destroy`:
```ts
destroy(gl: WebGL2RenderingContext) {
  if (this.glBuffer !== undefined && gl === this.bufferGL) {
    gl.deleteBuffer(this.glBuffer)
  }
  this.glBuffer = undefined
  this.bufferGL = undefined
}
```

### Step 3: Implement `GPUDrawElements.bind()`

**File:** `src/rendering/WebGL/gpuDrawElements.ts`

Import `glTypeToEnum` and `typeElemSize` from `./shaderprogram`.

```ts
bind<SHADER extends Shader>(
  gl: WebGL2RenderingContext,
  shader: SHADER,
  uniforms?: UniformSet<SHADER['shaderDef']>,
) {
  shader.bind(gl, uniforms)

  let elementBuffer: VertexArray<any> | undefined

  for (const k in this.vertexData) {
    const varray = this.vertexData[k]

    if (varray.target === VertexArrayTarget.ElementArrayBuffer) {
      elementBuffer = varray
      continue
    }

    // Bind array buffer and set up vertex attrib pointer
    varray.bind(gl)
    const loc = shader.getAttrLocation(k)
    if (loc >= 0) {
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(
        loc,
        varray.size,
        glTypeToEnum(gl, varray.type),
        false,
        0,
        0,
      )
    }
  }

  if (elementBuffer) {
    elementBuffer.bind(gl)
    gl.drawElements(
      gl.TRIANGLES,
      this.lastElement * this.vertsPerElement,
      glTypeToEnum(gl, elementBuffer.type),
      0,
    )
  } else {
    gl.drawArrays(
      gl.TRIANGLES,
      0,
      this.lastElement * this.vertsPerElement,
    )
  }
}
```

## Files to modify

1. `src/rendering/WebGL/shaderprogram.ts` — add `getAttrLocation` to both `ShaderProgramBase` and `ShaderWithMacros`
2. `src/rendering/WebGL/vertexArray.ts` — implement `bind`, `flagRangeUpdated`, `destroy`, add GPU buffer tracking fields
3. `src/rendering/WebGL/gpuDrawElements.ts` — implement `bind` method body

## Verification

1. Run `pnpm typecheck` to confirm no type errors
2. Run `pnpm build` to verify production build
3. Run `pnpm dev` and verify WebGL rendering works in the browser
4. Read `gpuDrawElements.ts` and check it for any inconsistencies or issues.