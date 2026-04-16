export type IEvents = {
  [key: string]: (...args: any[]) => void
}

type EventTypes<T extends IEvents> = keyof T

export class EventEmitter<EVENTS extends IEvents> {
  private handlers = new Map<
    EventTypes<EVENTS>,
    Set<(...args: any[]) => void>
  >()
  private onceHandlers = new Map<
    EventTypes<EVENTS>,
    Set<(...args: any[]) => void>
  >()

  on<K extends EventTypes<EVENTS>>(event: K, handler: EVENTS[K]) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }
  once<K extends EventTypes<EVENTS>>(event: K, handler: EVENTS[K]) {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set())
    }
    this.onceHandlers.get(event)!.add(handler)
  }

  off(event: EventTypes<EVENTS>, handler: EVENTS[EventTypes<EVENTS>]) {
    if (this.handlers.has(event)) {
      this.handlers.get(event)!.delete(handler)
    }
  }

  emitEvent(event: EventTypes<EVENTS>, ...args: Parameters<EVENTS[EventTypes<EVENTS>]>) {
    if (this.handlers.has(event)) {
      for (const handler of this.handlers.get(event)!) {
        handler(...args)
      }
    }
    if (this.onceHandlers.has(event)) {
      for (const handler of this.onceHandlers.get(event)!) {
        handler(...args)
      }
      this.onceHandlers.delete(event)
    }
  }
}
