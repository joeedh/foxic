 Procedural Texture Design System
 
## Context
 
The `@gametest/texgen` package is a mostly-empty visual tool built on the `vis-tester-base` app shell. It has a `TexGenFile` model holding a `Mesh`, a `MeshTool` that wraps the base mesh selection/translate tool mode, and a basic canvas editor. The goal is to extend it into a full procedural texture design system with:
 
1. Bezier path drawing (using the meshlib curve tools already present)
2. SDF generation by blurring drawn paths on Canvas2D, then uploading to WebGL
3. A WebGL preview editor (using `@gametest/webgl`)
4. A node-based shader graph editor
This is a first-pass implementation, so shader graph evaluation is simple GLSL assembly, and SDF quality is blur-based (not analytical).
 
---
 
## Architecture
 
```
+----------------------------+---------------------+
|  Curve Editor (canvas2D)   | WebGL Preview       |
|  CurveTool draws bezier    | Fullscreen quad      |
|  paths, handles            | + compiled shader    |
+----------------------------+---------------------+
|        Node Graph Editor (canvas2D overlay)       |
+---------------------------------------------------+
|        Main Menu Bar                              |
+---------------------------------------------------+
 
Data flow:
  Mesh (bezier paths)
    → sdfGen.buildSdfCanvas()       [canvas2D blur]
    → Texture.uploadMedia(gl, ...)  [@gametest/webgl]
    → ShaderProgramBase (compiled from NodeGraph)
    → WebGL preview canvas
```
 
---
 
## Critical Files
 
- `packages/texgen/src/model.ts` — add `NodeGraph` field to `TexGenFile`
- `packages/texgen/src/context.ts` — expose `graph`, `sdfTexture`, `gl`
- `packages/texgen/src/meshtool.ts` — extend draw() to render bezier handles; register `CurveTool`
- `packages/texgen/src/appmain.ts` — override `createDefaultScreen()` for 3-panel layout
New files:
- `packages/texgen/src/curveTool.ts`
- `packages/texgen/src/sdfGen.ts`
- `packages/texgen/src/shaderGraph.ts`
- `packages/texgen/src/nodeGraphEditor.ts`
- `packages/texgen/src/webglPreview.ts`
---
 
## Existing Reuse
 
| Thing | Location |
|-------|----------|
| Bezier edge eval | `packages/mesh/mesh.ts` — `Edge.evaluate(t)`, `e.h1`, `e.h2` handles |
| Bezier math | `packages/mesh/bezier.ts` — `cubic()`, `dcubic()` |
| Mesh handles | `packages/mesh/config.ts` — `MESH_HANDLES: true` (already on) |
| Texture upload from canvas | `packages/webgl/texture.ts` — `Texture.uploadMedia(gl, canvas)` |
| Shader compilation | `packages/webgl/shaderprogram.ts` — `ShaderProgramBase` |
| Editor base | `packages/vis-tester/editors/canvasEditor.ts` — pattern to follow for new editors |
| App screen split | `packages/vis-tester/core/app.ts` — `screen.splitArea()` |
| MeshToolMode base | `packages/vis-tester/toolmode/toolmode_mesh.ts` |
 
---
 
## Implementation Steps
 
### Step 1 — `curveTool.ts`
 
New `ToolMode` extending `MeshToolMode<TexGenContext>`.
 
Pointer behavior:
- **Click empty space** → if active vertex exists, call `mesh.makeEdge(mesh.makeVertex(pos), activeVert)`; set new vert as active. This uses the existing `makeEdge` which auto-creates `h1`/`h2` handles since `MESH_HANDLES: true`.
- **Click + drag from a handle** → `TranslateOp` on the handle only.
- All operations wrapped in `undoPre` / `undo` pattern from `MeshOp` (can call `mesh.regenRender()` at end).
Draw method (extends super.draw):
```
for each edge in mesh.edges:
  - draw bezier using canvas2D bezierCurveTo(h1, h2, v2)
  - draw dashed lines from v1→h1, v2→h2
  - draw h1, h2 as small squares
```
 
Registered with `ToolMode.register(CurveTool)` and nstructjs.
 
### Step 2 — `sdfGen.ts`
 
```typescript
export function buildSdfCanvas(
  mesh: Mesh,
  width: number,
  height: number,
  opts: { strokeWidth: number; blurRadius: number }
): HTMLCanvasElement
```
 
Implementation:
1. Create `HTMLCanvasElement`, get `'2d'` context
2. Fill black background
3. Set `g.filter = \`blur(${opts.blurRadius}px)\``
4. Set `g.strokeStyle = 'white'`, `g.lineWidth = opts.strokeWidth`
5. For each `edge` in `mesh.edges`:
   - `g.beginPath(); g.moveTo(e.v1.co[0], e.v1.co[1])`
   - If `e.h1`: `g.bezierCurveTo(h1.co[0], h1.co[1], h2.co[0], h2.co[1], e.v2.co[0], e.v2.co[1])`
   - Else: `g.lineTo(e.v2.co[0], e.v2.co[1])`
   - `g.stroke()`
6. Return canvas
```typescript
export function uploadSdfTexture(
  gl: WebGL2RenderingContext,
  mesh: Mesh,
  width: number,
  height: number,
  opts: { strokeWidth: number; blurRadius: number },
  existing?: Texture
): Texture
```
Calls `buildSdfCanvas`, then `texture.uploadMedia(gl, canvas, { filter: 'linear' })`.
 
### Step 3 — `shaderGraph.ts`

Connections between nodes are stored on the sockets themselves (not in a separate array).
Nodes are identified by `node.constructor.nodeDef.typeName`, not a string-union enum.

#### Sockets

```typescript
abstract class NodeSocket<VALUE> {
  name: string = ''
  type: string = ''
  value: VALUE
  edges: NodeSocket<VALUE>[] = []   // connected sockets (both directions)
  socketType: 'input' | 'output' = 'input'

  constructor(value: VALUE)
  clone(): this
  protected copyTo(other: this): this
  // sockets can be connected to each other 
  // without regard to type, we will perform
  // type coercian at the shader generation stage
  connect(other: NodeSocket<any>): this {
    if (this === other) {
        throw new Error('Cannot connect socket to itself')
    }
    if (this.socketType === other.socketType) {
        throw new Error(`Cannot connect two ${this.socketType}s together`)
    }
    
    this.edges.push(other)
    other.edges.push(this)
    return this
  }
}

// example sockets, we will also need vec2/vec3/vec4 and mat3/mat4 sockets too
export class IntSocket extends NodeSocket<number> { constructor(value?: number) }
export class FloatSocket extends NodeSocket<number> { constructor(value?: number) }
```

#### Node definition interfaces

```typescript
interface INodeDef {
  typeName: string
  uiName: string
  description: string
  icon?: number
  inputs: Record<string, NodeSocket<any>>    // prototype instances cloned per node
  outputs: Record<string, NodeSocket<any>>
}

interface INodeConstructor {
  readonly nodeDef: INodeDef
}
```

#### `NodeBase<CHILD>` abstract class

```typescript
abstract class NodeBase<CHILD extends INodeConstructor> {
  static readonly nodeDef: INodeDef = {
    typeName: 'BASE', uiName: '', description: '', icon: 0, inputs: {}, outputs: {},
  }
  pos: [number, number] = [0, 0]

  declare readonly ['constructor']: CHILD
  declare inputs: CHILD['nodeDef']['inputs']
  declare outputs: CHILD['nodeDef']['outputs']

  constructor() {
    // clone prototype sockets so each node instance is independent
    this.inputs  = Object.fromEntries(
      Object.entries(this.constructor.nodeDef.inputs).map(([k, v]) => [k, v.clone()])
    ) as CHILD['nodeDef']['inputs']
    this.outputs = Object.fromEntries(
      Object.entries(this.constructor.nodeDef.outputs).map(([k, v]) => [k, v.clone()])
    ) as CHILD['nodeDef']['outputs']
  }
}
```

Each concrete node class carries a `CHILD` generic so typed socket access flows through:

```typescript
export class SdfInputNode<CHILD extends INodeConstructor = typeof SdfInputNode>
  extends NodeBase<CHILD> {
  static readonly nodeDef = {
    ...super.nodeDef,
    typeName: 'SDF_INPUT', uiName: 'SDF Input',
    description: 'Samples the u_sdf texture → float',
    outputs: { value: new FloatSocket() },
  }
}

export class OutputNode<CHILD extends INodeConstructor = typeof OutputNode>
  extends NodeBase<CHILD> {
  static readonly nodeDef = {
    ...super.nodeDef,
    typeName: 'OUTPUT', uiName: 'Output',
    description: 'Final color output',
    inputs: { color: new FloatSocket() },
  }
}

// MultiplyNode, AddNode, ThresholdNode, MixNode follow the same pattern
```

#### Connecting sockets

```typescript
const from: NodeSocket<any>
const to: NodeSocket<any>
from.connect(to)
// this also works
to.connect(from)
```

#### `NodeGraph`

```typescript
export class NodeGraph {
  nodes: NodeBase<any>[]
  // No connections array — connections live on socket.edges

  addDefaultNodes(): void   // SdfInputNode → OutputNode
  compile(): { vertSrc: string; fragSrc: string }
}
```

`compile()` does a topological sort (traversing `socket.edges`) and emits GLSL keyed on
`node.constructor.nodeDef.typeName`:
- `SDF_INPUT` → `float sdf_NNN = texture(u_sdf, v_uv).r;`
- `MULTIPLY`  → `float mul_NNN = a * b;`
- `OUTPUT`    → `out_color = vec4(vec3(output_val), 1.0);`

Vertex shader: hardcoded fullscreen-triangle with a variable number of vertex attributes.
               There is always one position attribute, in addition special nodes will eventually
               be used to create more attributes (this will come later).

All concrete node classes + `NodeGraph` serialized with nstructjs, registered in `TexGenFile`.

Default graph: `SdfInputNode → OutputNode`.
 
### Step 4 — `nodeGraphEditor.ts`
 
New `Editor` subclass (follows `CanvasEditor` pattern but draws graph UI):
 
- Internal `canvas: HTMLCanvasElement` with `'2d'` context
- `draw()`: clear, then for each node draw a rounded rect with title + port dots; for each connection draw a cubic bezier between port positions
- Pointer events: drag nodes (translate), drag from output port to input port (create `NodeConnection`), right-click node to delete
- On any graph change: call `ctx.redrawAll()` which triggers `WebGLPreview` to recompile
Registered as `Editor` with `Editor.register(NodeGraphEditor)`.
 
### Step 5 — `webglPreview.ts`
 
New `Editor` subclass:
 
```typescript
export class WebGLPreviewEditor extends Editor<TexGenContext> {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private shader?: ShaderProgramBase<...>
  private compiledGraphHash: number = -1
 
  draw() { ... }
}
```
 
- `init()`: create canvas, get `webgl2` context, append to shadow
- `draw()`:
  1. If graph hash changed → recompile shader from `ctx.graph.compile()`
  2. Bind shader, set `u_sdf` uniform to `ctx.sdfTexture`
  3. `gl.drawArrays(gl.TRIANGLES, 0, 3)` (fullscreen triangle, no vertex buffer)
- Listens to `meshRedrawEmitter` → calls `uploadSdfTexture(...)` then redraws
### Step 6 — Update `model.ts`
 
Add `NodeGraph` field to `TexGenFile`:
```typescript
import { NodeGraph } from './shaderGraph'
 
export class TexGenFile {
  mesh: Mesh
  graph: NodeGraph   // NEW
 
  constructor() {
    this.mesh = new Mesh()
    this.graph = new NodeGraph()
    this.graph.addDefaultNodes()  // sdf_input → output
    // ... existing vertex setup
  }
}
```
 
Update STRUCT to include `graph: texgen.NodeGraph`.
 
### Step 7 — Update `context.ts`
 
```typescript
export class TexGenContext extends AppContext<TexGenFile, typeof SettingsTemplate> {
  sdfTexture?: Texture
  gl?: WebGL2RenderingContext    // set by WebGLPreviewEditor on init
 
  get mesh() { return this.state.model.mesh }
  get graph() { return this.state.model.graph }
}
```
 
### Step 8 — Update `meshtool.ts`
 
- Import and register `CurveTool`
- Extend `buildSideBar` to add blur/stroke width sliders
- Extend `draw()` to also call bezier-specific rendering (or delegate to the toolmode)
### Step 9 — Update `appmain.ts`
 
Override `createDefaultScreen()`:
 
```
MenuBar     (top strip)
CurveEditor (left, ~60% width)
WebGLPreview (right, ~40% width)
NodeGraphEditor (bottom strip, ~30% height)
```
 
Using `screen.splitArea()` calls chained to produce this layout.
 
---
 
## Verification
 
1. `cd packages/texgen && pnpm dev` — open browser
2. Curve editor: click to place vertices → bezier paths appear with handles
3. Drag a handle → curve updates; the SDF texture in the WebGL preview updates
4. Node graph editor: default `sdf_input → output` renders the blurred curve as grayscale
5. Add a `threshold` node between them → toggles hard/soft edge in preview
6. `pnpm typecheck` from repo root — no type errors