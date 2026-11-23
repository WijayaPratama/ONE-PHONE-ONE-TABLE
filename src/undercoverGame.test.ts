import { expect, it } from 'vitest'
import { canStart, defaultPairs, finalWhiteIndex, normalizeWord, shuffle, winnerOf } from './undercoverGame'

it('contains 50 distinct pairs and accepts only a valid majority', () => {
  expect(new Set(defaultPairs.map(pair => pair.join('|'))).size).toBe(50)
  expect(canStart(['A', 'B', 'C'], 1, 0)).toBe(true)
  expect(canStart(['A', 'B', 'C'], 1, 1)).toBe(false)
  expect(canStart(['A', ' a ', 'C'], 0, 1)).toBe(false)
  expect(canStart(Array.from({ length: 20 }, (_, i) => `Player ${i}`), 2, 1)).toBe(true)
})

it('preserves role counts and normalizes guesses', () => {
  expect(shuffle(['Civilian', 'Civilian', 'Mr. White']).sort()).toEqual(['Civilian', 'Civilian', 'Mr. White'])
  expect(normalizeWord('  MARTABAK  Manis ')).toBe('martabak manis')
})

it('ends when one Civilian remains or after every infiltrator is eliminated', () => {
  const civilian = { name: 'A', role: 'Civilian' as const, alive: true }
  const infiltrator = { name: 'B', role: 'Undercover' as const, alive: true }
  expect(winnerOf([civilian, infiltrator])).toBe('Infiltrator')
  expect(winnerOf([civilian, { ...infiltrator, alive: false }])).toBe('Civilian')
  expect(winnerOf([civilian, { ...civilian, name: 'C' }, infiltrator])).toBeUndefined()
  const white = { name: 'W', role: 'Mr. White' as const, alive: true }
  expect(winnerOf([civilian, white])).toBeUndefined()
  expect(finalWhiteIndex([civilian, white])).toBe(1)
  expect(finalWhiteIndex([civilian, white, infiltrator])).toBe(-1)
  expect(finalWhiteIndex([civilian, { ...civilian, name: 'C' }, white])).toBe(-1)
  expect(winnerOf([white])).toBeUndefined()
  expect(winnerOf([civilian, { ...white, alive: false }])).toBe('Civilian')
  expect(winnerOf([
    civilian, { ...civilian, name: 'C' }, { ...civilian, name: 'D', alive: false },
    infiltrator, { name: 'E', role: 'Mr. White', alive: true },
  ])).toBeUndefined()
})
