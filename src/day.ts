import type { DayState, GameState, Player } from './types'
import { isWolf, teamOf } from './data'

export const defaultDay = (seconds: number): DayState => ({ discussionRemaining: seconds, discussionRunning: false, discussionStartedAt: undefined, votes: {}, voteIndex: 0 })
export const alivePlayers = (game: GameState) => game.players.filter(player => player.isAlive)
export const playerById = (game: GameState, id?: string) => game.players.find(player => player.id === id)
export function voteSummary(votes: DayState['votes']) { const counts: Record<string, number> = {}; Object.values(votes).forEach(target => { if (target !== 'abstain') counts[target] = (counts[target] ?? 0) + 1 }); const max = Math.max(0, ...Object.values(counts)); const leaders = Object.keys(counts).filter(id => counts[id] === max); return { counts, max, leaders, winner: max > 0 && leaders.length === 1 ? leaders[0] : undefined } }
export function checkWinner(players: Player[]): string | undefined { const alive = players.filter(p => p.isAlive); const wolves = alive.filter(p => isWolf(p.role)).length; const villagers = alive.filter(p => teamOf(p.role) === 'Desa').length; if (!alive.some(p => teamOf(p.role) === 'Werewolf')) return 'Tim Desa menang! Semua Werewolf telah dieliminasi.'; if (wolves > 0 && wolves >= villagers) return 'Tim Werewolf menang! Werewolf telah menguasai desa.'; return undefined }
