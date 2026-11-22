import { describe, expect, it } from 'vitest'
import { blankComposition, recommendedPreset } from './data'
import { checkWinner, voteSummary } from './day'
import { defaultNight, nextAvailableStage, nightOutcome } from './night'
import { pauseTimer, remainingTime } from './timer'
import { eliminate, hasWolfRage, resolveAbilities } from './abilities'
import type { GameState, Player } from './types'

const player = (id: string, role: Player['role'], isAlive = true): Player => ({ id, username: id, role, isAlive })
const game = (players: Player[]): GameState => ({ players, roleConfiguration: blankComposition(), currentPhase: 'test', currentRound: 1, settings: { nightDuration: 90, dayDuration: 180, votingDuration: 60, soundEnabled: false }, events: [], dealtCount: 0, page: 'dashboard', night: defaultNight(90), day: { discussionRemaining: 180, discussionRunning: false, votes: {}, voteIndex: 0 } })

describe('aturan inti Werewolf', () => {
  it('racun menembus Guardian dan penyembuh hanya habis jika target diserang', () => {
    const state = game([player('w', 'witch'), player('a', 'alpha'), player('v', 'villager')])
    state.night.doctorTarget = 'v'
    state.night.potion = { actorId: 'w', targetId: 'v', kind: 'save' }
    expect(resolveAbilities(state).players[0].saveUsed).toBeUndefined()
    state.night.wolfTarget = 'v'
    expect(resolveAbilities(state).players[0].saveUsed).toBe(true)
    state.night.potion.kind = 'poison'
    expect(resolveAbilities(state).players[2].eliminatedBy).toBe('Racun Witch')
  })
  it('Lovers gugur bersama, Doppelganger mewarisi role, dan Wolfcub memicu ronde berikutnya', () => {
    const state = game([{ ...player('a', 'wolfcub'), loverId: 'b' }, { ...player('b', 'villager'), loverId: 'a' }, { ...player('d', 'doppelganger'), copyId: 'b' }])
    const result = eliminate(state, [{ id: 'a', cause: 'Voting siang' }])
    expect(result.fallen).toEqual(['a', 'b'])
    expect(result.players[2].role).toBe('villager')
    expect(hasWolfRage({ ...state, players: result.players, currentRound: 2 })).toBe(true)
  })
  it('tetap memanggil role yang sudah tereliminasi', () => {
    const state = game([player('A', 'guardian', false), player('B', 'werewolf')])
    expect(nextAvailableStage(state, 'idle')).toBe('guardian')
    expect(nextAvailableStage(state, 'guardian')).toBe('werewolf')
  })
  it('preset role berisi Werewolf dan total sesuai pemain', () => { const preset = recommendedPreset(8); expect(preset.werewolf).toBeGreaterThan(0); expect(Object.values(preset).reduce((a, b) => a + b, 0)).toBe(8) })
  it('mendeteksi kemenangan desa dan Werewolf', () => { expect(checkWinner([player('A', 'villager'), player('B', 'seer')])).toContain('Desa'); expect(checkWinner([player('A', 'werewolf'), player('B', 'villager')])).toContain('Werewolf') })
  it('menghitung kandidat tunggal dan seri voting', () => { expect(voteSummary({ a: 'b', c: 'b' }).winner).toBe('b'); expect(voteSummary({ a: 'b', c: 'd' }).winner).toBeUndefined() })
  it('melewati role malam yang tidak tersedia', () => { const state = game([player('A', 'werewolf'), player('B', 'villager')]); expect(nextAvailableStage(state, 'idle')).toBe('werewolf') })
  it('membatalkan serangan apabila Doctor melindungi target', () => { const state = game([player('A', 'werewolf'), player('B', 'guardian'), player('C', 'villager')]); state.night.wolfTarget = 'C'; state.night.doctorTarget = 'C'; expect(nightOutcome(state).saved).toBe(true) })
  it('timer menggunakan timestamp dan dapat dijeda', () => { const startedAt = 10_000; expect(remainingTime(90, startedAt, true, 20_000)).toBe(80); expect(pauseTimer(90, startedAt, true).running).toBe(false) })
})
