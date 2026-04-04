export interface IHashDigest<T extends number | string> {
  addFloat(f: number): this
  addInt(f: number): this
  addBool(f: boolean): this
  addString(f: string): this
  addFloatArray(f: Float32Array | Float64Array | Iterable<number>): this
  digest(): T
  // resets the hash state
  reset(): this
}

export class InsecureHashDigest implements IHashDigest<number> {
  private state: number = 0x811c9dc5

  addFloat(f: number): this {
    // Multiply by large prime to spread bits, then mix
    const bits = (f * 2654435761) | 0
    this.state = (this.state ^ bits) * 0x01000193
    return this
  }

  addInt(i: number): this {
    this.state = (this.state ^ i) * 0x01000193
    return this
  }

  addBool(b: boolean): this {
    this.state = (this.state ^ (b ? 1 : 0)) * 0x01000193
    return this
  }

  addString(s: string): this {
    for (let i = 0; i < s.length; i++) {
      this.state = (this.state ^ s.charCodeAt(i)) * 0x01000193
    }
    return this
  }

  addFloatArray(a: Float32Array | Float64Array | Iterable<number>): this {
    for (const v of a) {
      const bits = (v * 2654435761) | 0
      this.state = (this.state ^ bits) * 0x01000193
    }
    return this
  }

  digest(): number {
    return this.state >>> 0
  }

  reset(): this {
    this.state = 0x811c9dc5
    return this
  }
}
