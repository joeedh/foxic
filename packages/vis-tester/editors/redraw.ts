import { EventEmitter } from '@gametest/utils'

class RedrawEmitter extends EventEmitter<{ redraw: () => void }> {
  //
}

export const redrawEmitter = new RedrawEmitter()

let animReq: unknown | undefined
function draw() {
  animReq = undefined
  redrawEmitter.emitEvent('redraw')
}
export function redrawAll() {
  if (animReq === undefined) {
    animReq = requestAnimationFrame(draw)
  }
}
