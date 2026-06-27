/** Mulberry32 seeded PRNG — fast, deterministic, good distribution for game use. */
export type Rng = () => number

export function createRng(seed: number): { rng: Rng; getSeed: () => number } {
  let s = seed >>> 0
  return {
    rng(): number {
      s = (s + 0x6D2B79F5) >>> 0
      let t = Math.imul(s ^ (s >>> 15), 1 | s)
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
    getSeed(): number {
      return s
    },
  }
}

/**
 * Erzeugt einen deterministischen RNG fuer einen spezifischen Task.
 * Wird von der TimeSlotQueue verwendet, um parallele Tasks mit unterschiedlichen Seeds zu versehen.
 */
export function createRngForTask(seed: number): Rng {
  let s = seed >>> 0
  return function rng(): number {
    s = (s + 0x6D2B79F5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
