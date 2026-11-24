import { expect, it } from 'vitest'
import { createMission, modes, solved, type Difficulty } from './partyBombLogic'

it('generates unambiguous cable sequences, PINs and clue hands for every configuration', () => {
  let seed = 821
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
  for (const difficulty of Object.keys(modes) as Difficulty[]) {
    const config = modes[difficulty]
    for (let agents = 3; agents <= 6; agents++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const mission = createMission(difficulty, agents, random)
        expect(mission.wires).toHaveLength(config.wires)
        expect(new Set(mission.targets).size).toBe(config.cuts)
        expect(mission.pin).toHaveLength(config.digits)
        expect(mission.hands).toHaveLength(agents)
        const sizes = mission.hands.map(hand => hand.length)
        expect(Math.min(...sizes)).toBeGreaterThan(0)
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
        mission.targets.forEach((target, order) => {
          const facts = mission.clues.filter(clue => clue.order === order)
          const candidates = mission.wires.flatMap((_, i) => facts.every(clue => clue.allowed?.includes(i)) ? [i] : [])
          expect(candidates).toEqual([target])
        })
        const red = mission.wires.filter(color => color === 'Merah').length
        expect(mission.pin).toBe(`${mission.serial[0]}${red + 2}${mission.serial[2]}`.slice(0, config.digits))
        expect(solved(mission, config.cuts, true)).toBe(true)
        expect(solved(mission, config.cuts - 1, true)).toBe(false)
        expect(solved(mission, config.cuts, false)).toBe(config.digits === 0)
      }
    }
  }
})
