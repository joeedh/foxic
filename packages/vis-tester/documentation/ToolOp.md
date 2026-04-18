# Tool Ops — Introduction

A basic introduction to `path.ux`'s tool operator system, as used throughout
the mesh and vis-tester stack.

## What is a Tool Op?

A **tool op** is a single, reified, undoable operation. Every state change in
the application — selecting an element, moving it, toggling a flag, running
a mesh modifier — is implemented as a subclass of `ToolOp` with:

- **typed inputs** (and optional outputs) declared as `ToolProperty`
  instances,
- static metadata (`uiname`, `toolpath`, `icon`, `is_modal`, `undoflag`, …),
- explicit lifecycle hooks (`undoPre`, `execPre`, `exec`, `execPost`, `undo`),
- optional modal event handlers for interactive drags.

Because each operation is a plain object with typed inputs, undo/redo,
macros, replay, scripting, menu wiring, and keymap binding all fall out of
the same abstraction.

## The Big Picture

```
  user input                     menus / keymaps / scripts
       │                                   │
       ▼                                   ▼
   ToolMode                        ctx.api.execTool(ctx, Op, inputs)
       │                                   │
       └──────────────┬────────────────────┘
                      ▼
              ctx.toolstack.execTool(ctx, op, event?)
                      │
                      ├── op.undoPre(ctx)              (unless NO_UNDO)
                      ├── op.execPre(ctx)
                      ├── op.exec(ctx)                 (or modalStart)
                      └── op.execPost(ctx)
```

- **`ToolMode`s** interpret gestures and hand off to tool ops; they do not
  mutate state directly.
- **`ctx.api.execTool`** is the canonical entry point. It takes an op
  instance, class, or `toolpath` string, plus a partial inputs object.
- **`ctx.toolstack`** owns the undo stack and drives the op's lifecycle.

## Anatomy of a Tool Op

```ts
export class MyOp<CTX extends MyCtx> extends ToolOp<
  { amount: FloatProperty; target: IntProperty }, // inputs
  {},                                              // outputs
  CTX                                              // context
> {
  static tooldef(): ToolDef {
    return {
      uiname: "My Op",
      toolpath: "mydomain.my_op",
      is_modal: false,
      undoflag: 0,
      inputs: {
        amount: new FloatProperty(1.0),
        target: new IntProperty(),
      },
    }
  }

  undoPre(ctx: CTX) { /* snapshot state by stable id */ }
  undo(ctx: CTX)    { /* restore from snapshot */ }

  exec(ctx: CTX) {
    const { amount, target } = this.getInputs()
    // ...deterministic mutation driven entirely by inputs
  }
}

ToolOp.register(MyOp)
```

Notes:

- At runtime, subclass `inputs` / `outputs` are automatically merged with
  the parent class's slots. There is no longer any inheritance helper — just
  list your own slots in `tooldef()`.
- `ToolOp.register(cls)` wires the op into the global registry, menus,
  search, and `nstructjs` serialization.

## Slot Type Inheritance

**Runtime merging is automatic; TypeScript generics are not.** You still
have to thread the slot types through the generic parameters of the parent
class so that `this.inputs` and `this.getInputs()` see *all* slots — the
ones this class adds *plus* the ones the parent already declared.

The pattern is: make your subclass generic in an `Inputs` (and optionally
`Outputs`) parameter, then pass `Inputs & { ...newSlots }` up to the parent.
The parent class itself intersects its own slots into that type, so each
layer accumulates.

### Example — a two-level hierarchy

```ts
// Level 0: a domain base that always contributes `mode` and `selectMask`.
export class SelectOpBase<
  CTX extends MeshCtx,
  Inputs extends PropertySlots = {},
  Outputs extends PropertySlots = {},
> extends ToolOp<
  Inputs & { mode: EnumProperty; selectMask: FlagProperty },
  Outputs,
  CTX
> {
  static tooldef(): ToolDef {
    return {
      toolpath: "<select op base>",
      inputs: {
        mode:       new EnumProperty(SelToolModes.AUTO, SelToolModes),
        selectMask: new FlagProperty(1 | 2 | 4 | 8 | 16, MeshTypes),
      },
    }
  }
}

// Level 1: a concrete op that adds four of its own slots.
export class SelectOneOp<CTX extends MeshCtx> extends SelectOpBase<
  CTX,
  {
    elemEid:   IntProperty
    flush:     BoolProperty
    setActive: BoolProperty
    unique:    BoolProperty
  }
> {
  static tooldef() {
    return {
      uiname:   "Select One",
      toolpath: "mesh.select_one",
      inputs: {
        elemEid:   new IntProperty(),
        flush:     new BoolProperty(true),
        setActive: new BoolProperty(true),
        unique:    new BoolProperty(true),
      },
    }
  }

  exec(ctx: CTX) {
    // All six slots are visible and correctly typed:
    //   mode, selectMask       (inherited from SelectOpBase)
    //   elemEid, flush, setActive, unique  (declared here)
    const { mode, selectMask, elemEid, flush, setActive, unique } =
      this.getInputs()
    // ...
  }
}

ToolOp.register(SelectOneOp)
```

Things to notice:

- **`SelectOpBase` is generic over `Inputs`/`Outputs`.** It passes
  `Inputs & { mode; selectMask }` up to `ToolOp`. That `Inputs` is the
  hole where subclasses plug in their own slots.
- **`SelectOneOp` fills that hole** by passing a concrete slot record as
  the second generic argument to `SelectOpBase<...>`. It does *not* need
  to repeat `mode` or `selectMask` — those are already in the parent's
  intersection.
- **Runtime `tooldef()` only lists the new slots.** The resolved tool
  definition (built by `ToolOp._getFinalToolDef()`) walks the prototype
  chain and merges each level's `inputs` / `outputs` into a single flat
  record, so at runtime `this.inputs` has all six properties regardless.
- **`PropertySlots`** is the constraint type for these generic parameters
  — use `extends PropertySlots = {}` on any reusable intermediate base
  so callers can add their own slots without losing yours.

If a domain base does *not* need to be extended further, you can skip the
extra generic parameters and just intersect directly:

```ts
export class SimpleOp<CTX extends MyCtx> extends ToolOp<
  { amount: FloatProperty },   // inputs
  {},                          // outputs
  CTX
> { /* ... */ }
```

The generic-parameter form is only necessary when you want subclasses to
add more slots on top of yours.

## Lifecycle Hooks

| Hook         | Purpose                                              |
|--------------|------------------------------------------------------|
| `undoPre`    | Snapshot state before mutation.                      |
| `execPre`    | Setup immediately before `exec`.                     |
| `exec`       | Main mutation. Must be deterministic from inputs.    |
| `execPost`   | Cleanup / notifications (e.g. `mesh.regenRender()`). |
| `undo`       | Restore using the snapshot captured in `undoPre`.    |
| `redo`       | Defaults to re-running `exec`; can be overridden.    |
| `canRun`     | Static gate; controls UI availability.               |

## Invocation

```ts
ctx.api.execTool(ctx, MyOp, { amount: 2.0, target: vert.eid })
// or by toolpath string:
ctx.api.execTool(ctx, "mydomain.my_op", { amount: 2.0 })
```

The toolstack will:

1. Read the op's `undoflag`. Unless `NO_UNDO` is set, push onto the undo
   stack and call `undoPre(ctx)`.
2. If `is_modal`, call `modalStart(ctx)` — returns a `Promise` that resolves
   when the op ends. The op drives its own `exec` from pointer events.
3. Otherwise, call `execPre → exec → execPost` synchronously.

`execOrRedo` is a convenience that runs `undo` + `redo` instead of pushing a
new entry when the toolstack head is the same op — useful for repeated
tweaks in a redo panel.

## Modal Ops

Modal ops (e.g. drag-translate, drag-rotate) take over event processing for
their duration.

- Set `is_modal: true` in `tooldef()`.
- Override `modalStart(ctx)` for initialization; it returns a promise.
- Override `on_pointermove`, `on_pointerup`, `on_pointercancel`,
  `on_keydown`. Update `this.inputs.*` and call `this.exec(ctx)` each frame.
- Call `this.modalEnd(wasCancelled)` to finish.
- Modal ops are the **only** place a tool op may cache pointers to app
  state, and only for the duration of the modal session — drop them in
  `modalEnd`.

Example handoff from a tool mode (`MeshToolMode.onPointerMove`):

```ts
const tool = new TranslateOp<CTX>()
this.ctx!.api.execTool(this.ctx!, tool, { startMouse: this.startMouseDown })
```

## Rules of the Road

- **Never cache app-state pointers in a tool op.** Reference state by stable
  ids (e.g. `mesh.eidMap.get(eid)`). Undo/redo may replace objects.
- **`exec` must be deterministic from `inputs`.** Non-deterministic setup
  (mouse picking, reading ambient context defaults) belongs in a `static
  invoke(ctx, args)` override, which runs once at invocation time and bakes
  results into inputs. This keeps redo faithful.
- **Use ids, not references, in undo snapshots.** See
  `SelectOpBase.undoPre` for the canonical pattern.
- **Use `ToolOp.register`** — do not push into registries by hand.

## Inputs / Outputs

Each slot is a `ToolProperty` subclass (`IntProperty`, `BoolProperty`,
`FloatProperty`, `EnumProperty`, `FlagProperty`, `Vec2Property`,
`Vec3Property`, …). Common operations:

- `this.getInputs()` — destructurable object of current values.
- `this.inputs.foo.getValue()` / `setValue(v)` — read/write a slot.
- `this.inputs.foo.wasSet` — true when a caller explicitly supplied the
  value (vs. the default). Useful in `invoke` / `modalStart` to skip setup
  that the caller already primed.

Outputs are written by `exec` and may be consumed by macros or by DataPath
bindings.

## Undo Flags

Declared on `tooldef().undoflag`:

- `NO_UNDO` — skip the undo stack entirely (e.g. viewport navigation).
- `IS_UNDO_ROOT` — do not chain with the previous entry.
- `UNDO_BARRIER` — clear the redo branch at this point.

## Registration and Discovery

`ToolOp.register(MyOp)` makes the op reachable by its `toolpath` from:

- **Keymaps** — `HotKey("mydomain.my_op", args)` in a tool mode's
  `getKeyMaps()`.
- **Menus / buttons** — `path.ux` widgets accept a `toolpath`; label, icon,
  tooltip, `canRun`, and dispatch are wired automatically.
- **Search / command palette.**
- **DataPath** — via `defineAPI`, for property binding and scripting.

## Macros

Multiple ops can be composed into a single undo entry as a macro:

- The macro gets a synthetic class with merged inputs from its children.
- If any child is modal, the macro itself is modal.
- Non-modal children run synchronously; modal children are chained through
  their `modalEnd` promises.

Macros are the right tool for "click once → do several things as one undo
step".

## Concrete Examples in the Codebase

- `SelectOpBase`, `SelectOneOp`, `ToggleSelectOp`, `SelectLinked` in
  `packages/mesh/mesh_selectops.ts` — non-modal ops with id-based
  snapshots.
- `TransformOp`, `TranslateOp`, `ScaleOp`, `RotateOp` in
  `packages/mesh/transform_ops.ts` — modal ops sharing a common undo
  strategy via a pluggable `TransformElem` registry.
- `MeshToolMode` in `packages/vis-tester/toolmode/toolmode_mesh.ts` —
  consumer that converts gestures into `execTool` calls.

## Authoring Checklist

1. Subclass `ToolOp<Inputs, Outputs, CTX>` or a domain base.
2. Implement `static tooldef()` with `toolpath`, `uiname`, `inputs`,
   `outputs`, `is_modal`, `undoflag` as needed.
3. Implement `exec(ctx)` deterministically from inputs; reference state by
   stable ids.
4. Implement `undoPre(ctx)` and `undo(ctx)` (or inherit them).
5. If modal: override `modalStart`, pointer/key handlers, and call
   `this.exec(ctx)` during the drag; finish with `this.modalEnd(cancelled)`.
6. Optionally override `static invoke(ctx, args)` for context-aware
   defaults or mouse-based setup.
7. Optionally override `static canRun(ctx)` to gate availability.
8. `ToolOp.register(MyOp)` at module load.
9. Invoke via `ctx.api.execTool(ctx, MyOp, { ... })` or bind to a menu /
   keymap entry by `toolpath`.
