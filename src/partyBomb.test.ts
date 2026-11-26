import { expect, it } from 'vitest'
import { createMission, modes, possibleCuts, solved, type Difficulty } from './partyBombLogic'

it('generates unambiguous cable sequences, PINs and clue hands for every configuration', () => {
  let seed = 821
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
  for (const difficulty of Object.keys(modes) as Difficulty[]) {
    const config = modes[difficulty]
    for (let agents = 3; agents <= 6; agents++) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const mission = createMission(difficulty, agents, random)
        expect(mission.wires).toHaveLength(config.wires)
        expect(new Set(mission.targets).size).toBe(config.cuts)
        expect(mission.pin).toHaveLength(config.digits)
        expect(mission.hands).toHaveLength(agents)
        const sizes = mission.hands.map(hand => hand.length)
        const distributedClues = mission.hands.flat()
        expect(new Set(distributedClues).size).toBe(distributedClues.length)
        expect(Math.min(...sizes)).toBeGreaterThan(0)
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
        const expectedTotal = config.digits ? (agents <= 4 ? 9 : agents * 2) : agents <= 4 ? agents * 2 : 7
        expect(distributedClues).toHaveLength(expectedTotal)
        expect(distributedClues.every(clue => clue.split(/\s+/).length <= 15)).toBe(true)
        expect(new Set(mission.clues.map(clue => clue.family)).size).toBeGreaterThan(1)
        const sequences = possibleCuts(config.wires, config.cuts)
        const signatures = mission.clues.map(clue => sequences.map(sequence => Number(clue.accepts(sequence))).join(''))
        expect(new Set(signatures).size).toBe(signatures.length)
        expect(sequences.filter(sequence => mission.clues.every(clue => clue.accepts(sequence)))).toEqual([mission.targets])
        for (const hand of mission.hands) {
          const ownFacts = mission.clues.filter(clue => hand.includes(clue.text))
          const ownCandidates = sequences.filter(sequence => ownFacts.every(clue => clue.accepts(sequence)))
          mission.targets.forEach((_, order) => expect(new Set(ownCandidates.map(sequence => sequence[order])).size).toBeGreaterThan(1))
          expect(hand.filter(clue => clue.startsWith('Digit')).length).toBeLessThanOrEqual(1)
        }
        expect(new Set(mission.pinFacts.map(fact => fact.family)).size).toBe(config.digits)
        expect(mission.pinFacts.every(fact => /^[0-9]$/.test(fact.digit))).toBe(true)
        expect(mission.pin).toBe(mission.pinFacts.map(fact => fact.digit).join(''))
        expect(solved(mission, config.cuts, true)).toBe(true)
        expect(solved(mission, config.cuts - 1, true)).toBe(false)
        expect(solved(mission, config.cuts, false)).toBe(config.digits === 0)
      }
    }
  }
}, 30000)
