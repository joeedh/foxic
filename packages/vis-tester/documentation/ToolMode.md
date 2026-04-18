# Tool Mode System

A high-level overview of the tool mode subsystem in
`packages/vis-tester/toolmode/`.

## Purpose

Tool modes model distinct "editing modes" (conceptually similar to Blender's
Object / Edit / Sculpt modes). Each mode owns:

- how pointer and keyboard input are interpreted,
- what overlays are drawn on the canvas,
- what UI appears in the sidebar / header,
- which key maps are active,
- and how the mode's own state is serialized with the rest of the app file.

Only one tool mode is active at a time. Mutation of the underlying data is
delegated to DataAPI tool operators rather than performed by the mode itself.

## Key Files

- `toolmode/toolmode.ts` — abstract base `ToolMode`, registry, enum builder.
- `toolmode/toolmode_mesh.ts` — abstract `MeshToolMode` (concrete example of
  the pattern).

## Core Types

### `ToolMode<CTX extends AppContext>`

Abstract base class. Generic over an `AppContext` subtype so individual modes
can require extra context shape (e.g. mesh access).

Serialized state (via `nstructjs`):

- `selectMask: int` — bitmask for sub-element selection (used by mesh mode
  for `VERTEX` / `EDGE` / `FACE`; generic modes may ignore it).

Runtime state:

- `ctx?: CTX` — cached during `draw()`.

Virtual hooks (empty by default, overridden by concrete modes):

- **Lifecycle** — `onActive()`, `onInactive()`, `onUpdate()`.
- **Input** — `onPointerDown/Move/Up`, `onKeyDown/Up`.
- **Picking** — `findElement(selectMask, localMouse2d, limit?)`.
- **UI** — `buildSideBar(toolTab, propsTab)`, `buildHeader(container)`,
  `getKeyMaps(): KeyMap<CTX>[]`.
- **Drawing** — `draw(ctx, canvas, g)`.
- **Serialization** — `loadStruct(reader)` (subclasses chain via `super`).
- **DataAPI** — `static defineAPI(api)`.

### `IToolModeDef`

Static metadata every concrete mode must supply as
`static readonly toolModeDef`:

- `typeName: string` — stable identifier used by the registry and for
  serialization.
- `uiName: string` — label shown in menus.
- `description: string` — tooltip text.
- `icon: number` — icon id from `assets/icon_enum`.

An instance getter `toolModeDef` forwards to the constructor's static, so
code can read metadata from either the class or an instance.

### `IToolModeConstructor`

Constructor-shape interface: `new()` plus a `toolModeDef` static. Used for
typing registry entries.

## Registry

Module-level array `ToolModeClasses` in `toolmode.ts`:

- **`ToolMode.register(cls)`** — requires `nstructjs.isRegistered(cls)` (else
  throws), pushes the class into `ToolModeClasses`, and calls
  `registerDataClass(cls)` so the DataAPI picks it up.
- **`ToolMode.unregister(cls)`** — removes by identity; warns if absent.
- **`ToolMode.getClass(typeName)`** — lookup by `toolModeDef.typeName`.

### Menu / enum integration

`ToolMode.createToolModeEnum()` walks `ToolModeClasses` and builds a `path.ux`
`EnumProperty`, attaching:

- `addIcons(iconDef)`
- `addUINames(uiNameDef)`
- `addDescriptions(descDef)`

…all keyed by `typeName`. This is the single source of truth for mode
selectors — adding a new mode requires no menu-code changes.

## Concrete Example: `MeshToolMode`

`MeshToolMode<CTX extends AppContext & MeshCtx>` in `toolmode_mesh.ts`
illustrates the full pattern:

- **Context constraint** — intersects `AppContext` with `MeshCtx` so the mode
  can rely on `ctx.canvas`, `ctx.api`, and mesh-related context.
- **Abstract mesh source** — `abstract get mesh(): Mesh | undefined`; the
  mode does not own the mesh. Concrete app subclasses supply it.
- **Metadata** — `typeName: 'mesh'`, `icon: Icons.MESH`, etc.
- **Struct** — inline-registered `MeshToolMode {}` (empty; inherits
  `selectMask` from the base). `loadStruct` chains via `super`.
- **Picking** — a static `findElement(mesh, type, mouse, limit = 50)` walks
  verts/edges according to `MeshTypes` bits in `selectMask`, using
  `path.ux`'s `math.dist_to_line_2d` for edges. Faces are a TODO.
- **Highlight** — `updateHighlight()` calls `mesh.setHighlight(elem)` and
  triggers `ctx.redrawAll()` when the highlight changes.
- **Input → tool ops** — `onPointerDown` dispatches a `SelectOneOp` via
  `ctx.api.execTool(...)`, honoring shift/ctrl/meta for `unique`.
  `onPointerMove` transitions to a `TranslateOp` once drag distance exceeds
  5 px. `onPointerUp` resets the drag flag.
- **Drawing** — paints verts as arcs, edges as lines, and faces as
  translucent filled loops over `f.lists`, coloring with `getElemColor` +
  `color2css`.
- **Redraw bridge** — at module import,
  `meshRedrawEmitter.on('redraw', () => redrawAll())` connects mesh-side
  events to the editor redraw system.

## End-to-End Flow

1. A concrete mode extends `ToolMode` (or `MeshToolMode`), inline-registers
   an `nstructjs` struct, and defines `static toolModeDef`.
2. It calls `ToolMode.register(cls)`; this validates nstructjs registration,
   adds the class to `ToolModeClasses`, and registers it with the DataAPI.
3. The app calls `ToolMode.createToolModeEnum()` to populate toolbars/menus.
4. The active mode is stored on the app context. On save, its `selectMask`
   (plus any subclass-specific fields) round-trip through nstructjs; on
   load, `getClass(typeName)` re-instantiates the right class.
5. Editors (e.g. `editors/canvasEditor.ts`) forward pointer / key events and
   the `draw` call into the active mode, and call `buildSideBar` /
   `buildHeader` / `getKeyMaps` to populate UI.
6. The mode interprets gestures and issues DataAPI `execTool` calls
   (e.g. `SelectOneOp`, `TranslateOp` from `@gametest/meshlib`), keeping all
   state changes undoable and serializable.

## Design Notes

- **Data-driven menus.** All UI metadata for mode selection is derived from
  the registry; there is no hand-maintained enum for tool modes.
- **nstructjs-first.** `register()` refuses classes that haven't registered
  a struct, ensuring the active mode is always serializable.
- **Separation of concerns.** Modes interpret input and draw overlays; real
  mutations go through tool operators executed via `ctx.api.execTool`.
- **Generic over context.** `ToolMode<CTX>` lets concrete modes demand
  additional context capabilities without base-class coupling.
- **`selectMask` on the base.** Mildly mesh-flavored but stored as a generic
  `int`; non-mesh modes are free to ignore it.

## Adding a New Tool Mode

1. Create a subclass of `ToolMode<CTX>` (or a domain base such as
   `MeshToolMode`).
2. Add `static STRUCT = nstructjs.inlineRegister(this, "MyMode { ... }")`.
3. Add `static readonly toolModeDef: IToolModeDef` with `typeName`,
   `uiName`, `description`, `icon`.
4. Override the hooks you need: input, `draw`, `buildSideBar`,
   `getKeyMaps`, `loadStruct`, `defineAPI`.
5. Call `ToolMode.register(MyMode)` at module load time.
6. Rebuild the tool-mode enum (e.g. by calling
   `ToolMode.createToolModeEnum()` wherever the selector is defined).
