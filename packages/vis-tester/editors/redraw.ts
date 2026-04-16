import { EventEmitter } from '@gametest/utils'

class RedrawEmitter extends EventEmitter<{ redraw: () => void }> {
    //
}

export const redrawEmitter = new RedrawEmitter()

export function redrawAll() {
    redrawEmitter.emitEvent("redraw")
}
