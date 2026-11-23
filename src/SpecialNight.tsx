import { useState } from 'react'
import { languageKey, setLanguage, t, phrase, roleName, type Language } from './language'
import { isWolf, roles } from './data'
import type { GameState } from './types'

export function SpecialNight({ game, update, advance }: { game: GameState; update: (patch: Partial<GameState>) => void; advance: (patch?: Partial<GameState>) => void }) {
  const [targets, setTargets] = useState<string[]>([])
  const [kind, setKind] = useState<'save' | 'poison'>('save')
  const [result, setResult] = useState<string>()
  const { stage } = game.night
  if (stage !== 'witch' && stage !== 'cupid' && stage !== 'doppelganger' && stage !== 'sorcerer' && stage !== 'wolfSecond') return null
  const alive = game.players.filter(p => p.isAlive)
  const actor = alive.find(p => stage === 'wolfSecond' ? isWolf(p.role) : p.role === stage)
  const witch = stage === 'witch' ? alive.find(p => p.role === 'witch' && (kind === 'save' ? !p.saveUsed : !p.poisonUsed)) : undefined
  const candidates = !actor || (stage === 'witch' && (!witch || (kind === 'poison' && game.currentRound < 2))) ? [] : alive.filter(p =>
    stage === 'wolfSecond' ? !isWolf(p.role) && p.id !== game.night.wolfTarget :
    stage === 'sorcerer' || stage === 'doppelganger' ? p.id !== actor.id : true)
  const title = stage === 'wolfSecond' ? t('WEREWOLF — TARGET KEDUA') : phrase`${stage.toUpperCase()} BANGUN`
  const names = targets.map(id => alive.find(p => p.id === id)?.username).join(' dan ')
  const confirm = () => {
    const events = [...game.events, `Malam ${game.currentRound}: ${title} memilih ${names}.`]
    if (stage === 'sorcerer') {
      const message = alive.find(p => p.id === targets[0])?.role === 'seer' ? 'Seer' : 'Bukan Seer'
      update({ events: [...events, `Hasil Sorcerer: ${message}.`] })
      setResult(message)
      return
    }
    if (stage === 'witch' && witch) advance({ events, night: { ...game.night, potion: { kind, actorId: witch.id, targetId: targets[0] } } })
    if (stage === 'wolfSecond') advance({ events, night: { ...game.night, secondWolfTarget: targets[0] } })
    if (stage === 'doppelganger') advance({ events, players: game.players.map(p => p.id === actor?.id ? { ...p, copyId: targets[0] } : p) })
    if (stage === 'cupid') advance({ events, players: game.players.map(p => p.id === targets[0] ? { ...p, loverId: targets[1] } : p.id === targets[1] ? { ...p, loverId: targets[0] } : p) })
  }
  return <section className="card mt-5 space-y-3">
    <h2 className="font-bold text-violet-300">{title}</h2>
    <p className="text-sm text-slate-300">{stage === 'wolfSecond' ? t('Wolfcub gugur pada ronde sebelumnya. Pilih target tambahan.') : t(roles.find(role => role.id === stage)?.ability ?? '')}</p>
    {stage === 'witch' && actor && <div className="grid grid-cols-2 gap-2">
      <button className="btn-secondary" aria-pressed={kind === 'save'} onClick={() => { setKind('save'); setTargets([]) }}>{t("Penyembuh")}</button>
      <button className="btn-secondary" aria-pressed={kind === 'poison'} disabled={game.currentRound < 2} onClick={() => { setKind('poison'); setTargets([]) }}>{t("Racun")}</button>
    </div>}
    {result ? <p>Hasil rahasia: {names} — {result}</p> : <>
      {!candidates.length && <p className="text-sm">{t("Tidak ada aksi tersedia. Bacakan instruksi seperti biasa, lalu lanjutkan.")}</p>}
      {candidates.map(p => <button key={p.id} className={targets.includes(p.id) ? 'btn-secondary !border-cyan-400 !bg-cyan-950 text-cyan-100' : 'btn-secondary'} aria-pressed={targets.includes(p.id)} onClick={() => setTargets(stage !== 'cupid' ? [p.id] : targets.includes(p.id) ? targets.filter(id => id !== p.id) : [...targets.slice(-1), p.id])}>{p.username}</button>)}
      {stage === 'cupid' && targets.length === 2 && <p>{t("Tunjukkan secara rahasia kepada")} {names} bahwa mereka berpasangan.</p>}
    </>}
    <div className={!result && candidates.length ? 'grid grid-cols-2 gap-2' : undefined}>
      {!result && !!candidates.length && <button className="btn-primary !px-2 text-sm" disabled={targets.length !== (stage === 'cupid' ? 2 : 1)} onClick={confirm}>{t('Konfirmasi Pilihan')}</button>}
      <button className="btn-secondary !border-amber-700 !bg-amber-950 !px-2 text-sm !text-amber-100 hover:!bg-amber-900" onClick={() => advance()}>{result || !candidates.length ? t('Lanjutkan') : t('Lewati Aksi')}</button>
    </div>
  </section>
}
