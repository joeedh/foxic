export interface State<C> {
  enter?(ctx: C): void
  exit?(ctx: C): void
  update?(ctx: C, dt: number): void
}

export class StateMachine<C, S extends string> {
  private states = new Map<S, State<C>>()
  private currentKey: S | null = null
  private currentState: State<C> | null = null

  constructor(private ctx: C) {}

  add(key: S, state: State<C>) {
    this.states.set(key, state)
  }

  transition(key: S) {
    if (key === this.currentKey) return
    this.currentState?.exit?.(this.ctx)
    this.currentState = this.states.get(key) ?? null
    this.currentKey = key
    this.currentState?.enter?.(this.ctx)
  }

  update(dt: number) {
    this.currentState?.update?.(this.ctx, dt)
  }

  get current(): S | null {
    return this.currentKey
  }
}
