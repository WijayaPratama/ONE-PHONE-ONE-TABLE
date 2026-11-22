import type { GameState, NightStage, Player, RoleId } from './types'
import { isWolf } from './data'
import { hasWolfRage } from './abilities'

export const defaultNight = (seconds: number) => ({ stage: 'idle' as NightStage, timerRemaining: seconds, timerRunning: false, timerStartedAt: undefined })
export const aliveWithRole = (game: GameState, role: RoleId) => game.players.some(player => player.isAlive && player.role === role)
export const byId = (players: Player[], id?: string) => players.find(player => player.id === id)
export const nameOf = (game: GameState, id?: string) => byId(game.players, id)?.username ?? '—'

export function nextAvailableStage(game: GameState, after: NightStage): NightStage {
  const order: NightStage[] = ['cupid', 'doppelganger', 'seer', 'guardian', 'sorcerer', 'werewolf', 'wolfSecond', 'witch', 'resolution']
  const normalizedAfter: NightStage = after === 'seerResult' ? 'seer' : after === 'wolfConfirm' ? 'werewolf' : after
  const index = order.indexOf(normalizedAfter)
  for (let i = index + 1; i < order.length; i++) {
    const stage = order[i]
    if (stage === 'resolution') return stage
    if (stage === 'wolfSecond') { if (game.night.wolfTarget && hasWolfRage(game)) return stage; continue }
    if ((stage === 'cupid' || stage === 'doppelganger') && game.currentRound !== 1) continue
    if (game.players.some(player => stage === 'werewolf' ? isWolf(player.role) : player.role === stage)) return stage
  }
  return 'resolution'
}

export function startStage(game: GameState, stage: NightStage): GameState {
  return { ...game, currentPhase: stage === 'resolution' ? 'Resolusi Malam' : `Malam — ${stage}`, night: { ...game.night, stage, timerRunning: false, timerStartedAt: undefined } }
}

export function nightOutcome(game: GameState) {
  const target = byId(game.players, game.night.wolfTarget)
  const protectedPlayer = byId(game.players, game.night.doctorTarget)
  if (!target) return { target: undefined, protectedPlayer, saved: true, message: 'Tidak ada serangan malam ini.' }
  if (target.id === protectedPlayer?.id) return { target, protectedPlayer, saved: true, message: 'Serangan Werewolf berhasil digagalkan.' }
  return { target, protectedPlayer, saved: false, message: `${target.username} tereliminasi oleh serangan Werewolf.` }
}
