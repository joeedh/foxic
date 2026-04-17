export * from './hashDigest'
import { util } from 'path.ux'

export const cachering = util.cachering
export type cachering<T> = util.cachering<T>
export type MovingAvg = util.MovingAvg
export const MovingAvg = util.MovingAvg
export const isDenormal = util.isDenormal
export const termColor = util.termColor
export const termColorMap = util.termColorMap
export const termPrint = util.termPrint
export const isMobile = util.isMobile
export const getClassParent = util.getClassParent
export const printStack = util.print_stack
export * from './eventEmitter'
