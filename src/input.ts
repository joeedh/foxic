export enum Action {
  Left,
  Right,
  Up,
  Down,
  Jump,
}

const keyMap: Record<string, Action> = {
  ArrowLeft: Action.Left,
  ArrowRight: Action.Right,
  ArrowUp: Action.Up,
  ArrowDown: Action.Down,
  KeyZ: Action.Jump,
  Space: Action.Jump,
  KeyA: Action.Left,
  KeyD: Action.Right,
  KeyW: Action.Up,
  KeyS: Action.Down,
}

const currentFrame = new Set<Action>()
const previousFrame = new Set<Action>()
const rawKeys = new Set<Action>()
const pressedAge = new Map<Action, number>()

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const action = keyMap[e.code]
    if (action !== undefined) {
      rawKeys.add(action)
      e.preventDefault()
    }
  })

  window.addEventListener('keyup', (e) => {
    const action = keyMap[e.code]
    if (action !== undefined) {
      rawKeys.delete(action)
      e.preventDefault()
    }
  })
}

/** Call once per physics tick, before processing game logic. */
export function pollInput() {
  previousFrame.clear()
  for (const a of currentFrame) {
    previousFrame.add(a)
  }
  currentFrame.clear()
  for (const a of rawKeys) {
    currentFrame.add(a)
  }

  // Track how many frames since each action was first pressed
  for (const a of currentFrame) {
    if (!previousFrame.has(a)) {
      pressedAge.set(a, 0)
    } else {
      pressedAge.set(a, (pressedAge.get(a) ?? 0) + 1)
    }
  }
  for (const a of previousFrame) {
    if (!currentFrame.has(a)) {
      pressedAge.delete(a)
    }
  }
}

export function pressed(action: Action): boolean {
  return currentFrame.has(action)
}

export function justPressed(action: Action): boolean {
  return currentFrame.has(action) && !previousFrame.has(action)
}

export function justReleased(action: Action): boolean {
  return !currentFrame.has(action) && previousFrame.has(action)
}

/**
 * Returns true if the action was pressed within the last `frames` physics ticks.
 * Used for input buffering (e.g. pressing jump slightly before landing).
 */
export function pressedWithinFrames(action: Action, frames: number): boolean {
  const age = pressedAge.get(action)
  return age !== undefined && age < frames
}

/** Consume a buffered press so it won't trigger again. */
export function consumePress(action: Action) {
  pressedAge.delete(action)
}
