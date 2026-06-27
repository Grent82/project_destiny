import { describe, it, expect } from 'vitest'
import { createRng, createRngForTask } from './seededRng'

describe('seededRng', () => {
  describe('createRng', () => {
    it('produces deterministic sequence for same seed', () => {
      const rng1 = createRng(42).rng
      const rng2 = createRng(42).rng

      const sequence1 = [rng1(), rng1(), rng1()]
      const sequence2 = [rng2(), rng2(), rng2()]

      expect(sequence1).toEqual(sequence2)
    })

    it('produces different sequences for different seeds', () => {
      const rng1 = createRng(42).rng
      const rng2 = createRng(43).rng

      const val1 = rng1()
      const val2 = rng2()

      expect(val1).not.toEqual(val2)
    })

    it('produces values in range [0, 1)', () => {
      const rng = createRng(12345).rng

      for (let i = 0; i < 100; i++) {
        const val = rng()
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThan(1)
      }
    })

    it('advances seed correctly via getSeed', () => {
      const seeded = createRng(42)
      const initialSeed = seeded.getSeed()

      seeded.rng()
      seeded.rng()
      seeded.rng()

      expect(seeded.getSeed()).not.toEqual(initialSeed)
    })

    it('handles edge case seeds', () => {
      const rng0 = createRng(0).rng
      const rngMax = createRng(0xffffffff).rng

      expect(rng0()).toBeGreaterThanOrEqual(0)
      expect(rngMax()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('createRngForTask', () => {
    it('produces deterministic sequence for same task seed', () => {
      const rng1 = createRngForTask(100)
      const rng2 = createRngForTask(100)

      const sequence1 = [rng1(), rng1(), rng1()]
      const sequence2 = [rng2(), rng2(), rng2()]

      expect(sequence1).toEqual(sequence2)
    })

    it('produces different sequences for different task seeds', () => {
      const rng1 = createRngForTask(100)
      const rng2 = createRngForTask(101)

      expect(rng1()).not.toEqual(rng2())
    })

    it('produces values in range [0, 1)', () => {
      const rng = createRngForTask(54321)

      for (let i = 0; i < 100; i++) {
        const val = rng()
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThan(1)
      }
    })

    it('can be used for parallel task simulation', () => {
      const taskSeeds = [100, 200, 300, 400]
      const rngs = taskSeeds.map((seed) => createRngForTask(seed))

      // Each task RNG should produce independent but deterministic sequences
      const results = rngs.map((rng) => [rng(), rng(), rng()])

      // Verify all results are in valid range
      results.forEach((seq) => {
        seq.forEach((val) => {
          expect(val).toBeGreaterThanOrEqual(0)
          expect(val).toBeLessThan(1)
        })
      })

      // Verify sequences are different (different seeds)
      expect(results[0]).not.toEqual(results[1])
      expect(results[1]).not.toEqual(results[2])
    })

    it('maintains determinism across multiple calls', () => {
      const run1 = []
      const run2 = []

      for (let i = 0; i < 10; i++) {
        const rng = createRngForTask(42)
        run1.push(rng())
      }

      for (let i = 0; i < 10; i++) {
        const rng = createRngForTask(42)
        run2.push(rng())
      }

      expect(run1).toEqual(run2)
    })
  })

  describe('createRng vs createRngForTask', () => {
    it('both functions produce valid RNGs', () => {
      const rng1 = createRng(42).rng
      const rng2 = createRngForTask(42)

      // Both should produce values in [0, 1)
      expect(rng1()).toBeGreaterThanOrEqual(0)
      expect(rng1()).toBeLessThan(1)
      expect(rng2()).toBeGreaterThanOrEqual(0)
      expect(rng2()).toBeLessThan(1)
    })

    it('both functions use same algorithm so same seed produces same result', () => {
      // Both use Mulberry32 algorithm, so same seed gives same first value
      const rng1 = createRng(42).rng
      const rng2 = createRngForTask(42)

      expect(rng1()).toEqual(rng2())
    })
  })
})
