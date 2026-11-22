import { isWolf } from './data'
import type { EliminationCause, GameState, Player } from './types'

export function eliminate(game: GameState, victims: { id: string; cause: EliminationCause }[], atNight = false) {
  let players = [...game.players]
  const events: string[] = []
  const hunters: string[] = []
  const fallen: string[] = []
  const queue = [...victims]
  for (const { id, cause } of queue) {
    const player = players.find(p => p.id === id && p.isAlive)
    if (!player) continue
    players = players.map(p => p.id === id ? { ...p, isAlive: false, eliminatedBy: cause, eliminatedRound: game.currentRound, eliminatedAtNight: atNight } : p)
    fallen.push(id)
    events.push(`${atNight ? 'Malam' : 'Siang'} ${game.currentRound}: ${player.username} gugur (${cause}).`)
    if (player.role === 'hunter' && cause !== 'Efek Hunter') hunters.push(id)
    if (player.loverId) queue.push({ id: player.loverId, cause: 'Patah hati' })
    players = players.map(p => {
      if (!p.isAlive || p.role !== 'doppelganger' || p.copyId !== id || !player.role) return p
      events.push(`${p.username} mewarisi role ${player.username}.`)
      return { ...p, originalRole: p.originalRole ?? p.role, role: player.role, copyId: undefined }
    })
  }
  return { players, events, hunters, fallen }
}

export function wolfTargets(game: GameState): Player[] {
  return game.players.filter(p => p.isAlive && !isWolf(p.role) && [game.night.wolfTarget, game.night.secondWolfTarget].includes(p.id))
}

export function hasWolfRage(game: GameState) {
  return game.players.some(p => !p.isAlive && p.role === 'wolfcub' && p.eliminatedAtNight !== undefined && p.eliminatedRound === game.currentRound - 1)
}

export function resolveAbilities(game: GameState) {
  const attacks = wolfTargets(game)
  const potion = game.night.potion
  const used = potion?.kind === 'poison' || attacks.some(p => potion?.kind === 'save' && potion.targetId === p.id)
  const players = game.players.map(p => used && p.id === potion?.actorId
    ? { ...p, ...(potion.kind === 'save' ? { saveUsed: true } : { poisonUsed: true }) }
    : p)
  const victims: Parameters<typeof eliminate>[1] = attacks
    .filter(p => p.id !== game.night.doctorTarget && !(potion?.kind === 'save' && p.id === potion.targetId))
    .map(p => ({ id: p.id, cause: 'Werewolf' }))
  if (potion?.kind === 'poison') victims.unshift({ id: potion.targetId, cause: 'Racun Witch' })
  const result = eliminate({ ...game, players }, victims, true)
  const protectedEvents = attacks
    .filter(p => !victims.some(victim => victim.id === p.id))
    .map(p => `Malam ${game.currentRound}: Serangan terhadap ${p.username} berhasil dicegah.`)
  return { ...result, events: [...protectedEvents, ...result.events] }
}
