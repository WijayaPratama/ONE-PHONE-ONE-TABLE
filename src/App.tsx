import { useEffect, useMemo, useState } from 'react'
import { languageKey, setLanguage, t, phrase, roleName, gameText, type Language } from './language'
import { BookOpen, ChevronLeft, CircleHelp, Dices, Eye, EyeOff, Moon, Pause, Play, Plus, RotateCcw, Shield, ShieldAlert, Skull, Target, Users, Volume2, VolumeX, X } from 'lucide-react'
import { blankComposition, recommendedPreset, roleIds, roles, isWolf, teamOf } from './data'
import type { GameState, Page, Player, RoleId, Settings } from './types'
import { defaultNight, nameOf, nextAvailableStage, nightOutcome, startStage } from './night'
import { alivePlayers, checkWinner, defaultDay, playerById, voteSummary } from './day'
import { pauseTimer, remainingTime } from './timer'
import { playCue } from './sound'
import { eliminate, resolveAbilities } from './abilities'
import { SpecialNight } from './SpecialNight'

const STORE = 'werewolf-mvp-1'
const initialSettings: Settings = { nightDuration: 90, dayDuration: 180, votingDuration: 60, soundEnabled: true }
const initialGame = (): GameState => ({ players: [], roleConfiguration: blankComposition(), currentPhase: 'setup', currentRound: 1, settings: initialSettings, events: [], dealtCount: 0, page: 'landing', night: defaultNight(initialSettings.nightDuration), day: defaultDay(initialSettings.dayDuration) })
const iconFor = (id: RoleId) => id === 'werewolf' ? <Skull /> : id === 'seer' ? <Eye /> : id === 'guardian' ? <Shield /> : id === 'hunter' ? <Moon /> : id === 'tanner' ? <Dices /> : <Users />

function shuffle<T>(items: T[]) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] } return result }
function validNames(players: Player[]) { const names = players.map(p => p.username.trim().toLowerCase()); return names.every(Boolean) && new Set(names).size === names.length }
function loadGame(): GameState | null { try { const stored = localStorage.getItem(STORE); if (!stored) return null; const game = JSON.parse(stored) as GameState; const legacy = game.roleConfiguration as GameState['roleConfiguration'] & { doctor?: number }; const roleConfiguration = { ...blankComposition(), ...legacy, guardian: legacy.guardian ?? legacy.doctor ?? 0 }; const players = game.players.map(p => String(p.role) === 'doctor' ? { ...p, role: 'guardian' as const } : p); if (String(game.night?.stage) === 'doctor') game.night.stage = 'guardian'; return { ...game, players, roleConfiguration, night: game.night ?? defaultNight(game.settings?.nightDuration ?? 90), day: game.day ?? defaultDay(game.settings?.dayDuration ?? 180) } } catch { return null } }

export default function App() {
  const [locale, setLocale] = useState<Language>(() => localStorage.getItem(languageKey) === 'en' ? 'en' : 'id')
  setLanguage(locale)
  const changeLanguage = (value: Language) => { localStorage.setItem(languageKey, value); setLocale(value) }
  const [game, setGame] = useState<GameState>(() => loadGame() ?? initialGame())
  const [infoRole, setInfoRole] = useState<RoleId | null>(null)
  const [cardOpen, setCardOpen] = useState(false)
  useEffect(() => { localStorage.setItem(STORE, JSON.stringify(game)) }, [game])
  const update = (patch: Partial<GameState> | ((current: GameState) => Partial<GameState>)) => setGame(current => ({ ...current, ...(typeof patch === 'function' ? patch(current) : patch) }))
  const navigate = (page: Page) => { setCardOpen(false); update({ page }) }
  const fresh = () => { if (game.players.length && !window.confirm(t('Mulai permainan baru? Sesi permainan saat ini akan dihapus.'))) return; localStorage.removeItem(STORE); setCardOpen(false); setGame(initialGame()) }
  const replay = (changePlayers = false) => { setCardOpen(false); update({ players: game.players.map(player => ({ id: player.id, username: player.username, isAlive: true })), currentRound: 1, currentPhase: 'setup', events: [], dealtCount: 0, night: defaultNight(game.settings.nightDuration), day: defaultDay(game.settings.dayDuration), page: changePlayers ? 'players' : 'roles' }) }
  const totalRoles = roleIds.reduce((total, id) => total + game.roleConfiguration[id], 0)
  const roleValid = totalRoles === game.players.length && roleIds.some(id => isWolf(id) && game.roleConfiguration[id] > 0)
  const playerValid = game.players.length >= 6 && game.players.length <= 30 && validNames(game.players)

  const beginDeal = () => {
    const pool = roleIds.flatMap(id => Array.from({ length: game.roleConfiguration[id] }, () => id))
    // Shuffle only once, then keep distribution stable in storage.
    const shuffledRoles = shuffle(pool)
    update({ players: game.players.map((p, i) => ({ ...p, username: p.username.trim(), role: shuffledRoles[i], isAlive: true })), dealtCount: 0, page: 'deal', currentPhase: 'role_distribution' })
  }
  const current = game.players[game.dealtCount]

  return <main className="app">
    <label className="mb-4 flex items-center justify-end gap-2 text-sm text-slate-300"><span>{locale === 'en' ? 'Language' : 'Bahasa'}</span><select className="min-h-10 rounded-lg bg-slate-800 px-2" value={locale} onChange={event => changeLanguage(event.target.value as Language)}><option value="id">Indonesia</option><option value="en">English</option></select></label>
    {game.page !== 'landing' && <button onClick={() => navigate(game.page === 'roles' ? 'players' : game.page === 'settings' ? 'deal' : 'landing')} className="mb-5 flex min-h-12 items-center gap-2 text-sm text-slate-300"><ChevronLeft size={18}/> {['players', 'roles', 'settings'].includes(game.page) ? t('Kembali') : t('Beranda')}</button>}
    {game.page === 'landing' && <Landing game={game} go={navigate} fresh={fresh} />}
    {game.page === 'howto' && <HowTo />}
    {game.page === 'players' && <Players game={game} update={update} valid={playerValid} go={navigate} />}
    {game.page === 'roles' && <Roles game={game} update={update} total={totalRoles} valid={roleValid} beginDeal={beginDeal} openInfo={setInfoRole} />}
    {game.page === 'deal' && current && <Deal player={current} position={game.dealtCount + 1} total={game.players.length} cardOpen={cardOpen} setCardOpen={setCardOpen} next={() => game.dealtCount + 1 === game.players.length ? update({ dealtCount: game.players.length, page: 'settings', currentPhase: 'pre_game' }) : update({ dealtCount: game.dealtCount + 1 })} />}
    {game.page === 'deal' && !current && <section className="card"><h1 className="text-xl font-bold">{t("Pembagian kartu selesai")}</h1><button className="btn-primary mt-4" onClick={() => navigate('settings')}>{t("Lanjut ke Pengaturan")}</button></section>}
    {game.page === 'settings' && <SettingsPage game={game} update={update} go={navigate} />}
    {game.page === 'dashboard' && <Dashboard game={game} update={update} fresh={fresh} />}
    {game.page === 'morning' && <Morning game={game} go={navigate} />}
    {game.page === 'discussion' && <Discussion game={game} update={update} go={navigate} />}
    {game.page === 'voting' && <Voting game={game} update={update} go={navigate} />}
    {game.page === 'voteResult' && <VoteResult game={game} update={update} go={navigate} />}
    {game.page === 'hunter' && <Hunter game={game} update={update} go={navigate} />}
    {game.page === 'gameOver' && <GameOver game={game} fresh={fresh} replay={replay} />}
    {infoRole && <RoleModal role={roles.find(r => r.id === infoRole)!} close={() => setInfoRole(null)} />}
  </main>
}

function Landing({ game, go, fresh }: { game: GameState; go: (p: Page) => void; fresh: () => void }) {
  const resumable = game.players.length > 0 && game.page !== 'landing' && game.page !== 'howto' && game.page !== 'gameOver'
  return <section className="flex min-h-[calc(100vh-4rem)] flex-col justify-center text-center">
    <div className="mb-5 text-violet-400"><Moon className="mx-auto" size={44}/></div><p className="mb-2 text-xs font-bold tracking-[.25em] text-violet-400">ONE PHONE, ONE TABLE</p>
    <h1 className="text-5xl font-black tracking-tight">WEREWOLF</h1><p className="mt-3 text-lg text-violet-200">One Phone, One Table, Endless Fun.</p>
    <p className="mx-auto mt-6 max-w-sm leading-6 text-slate-400">{t("Permainan deduksi sosial yang membuat nongkrong semakin seru. Satu HP, banyak pemain, dan penuh kecurigaan.")}</p>
    <div className="mt-9 space-y-3">
      {resumable && <><button className="btn-primary" onClick={() => go(game.page)}><RotateCcw size={19}/> {t("Lanjutkan Permainan")}</button><button className="btn-secondary" onClick={fresh}>{t("Mulai Permainan Baru")}</button></>}
      {!resumable && <button className="btn-primary" onClick={() => go('players')}><Users size={19}/> {t("Main Werewolf")}</button>}
      <button className="btn-secondary" onClick={() => go('howto')}><BookOpen size={19}/> {t("Cara Bermain")}</button>
    </div>
  </section>
}

function HowTo() { return <section><h1 className="text-3xl font-bold">{t("Cara Bermain")}</h1><div className="mt-6 space-y-3 text-slate-300"><div className="card"><b>{t("1. Moderator menyiapkan game")}</b><p className="mt-1 text-sm text-slate-400">{t("Masukkan pemain dan pilih komposisi role secara manual.")}</p></div><div className="card"><b>{t("2. Bagikan kartu secara rahasia")}</b><p className="mt-1 text-sm text-slate-400">{t("Oper satu HP. Setiap pemain hanya melihat role miliknya.")}</p></div><div className="card"><b>{t("3. Mainkan fase malam dan siang")}</b><p className="mt-1 text-sm text-slate-400">{t("Werewolf beraksi malam hari, lalu semua pemain berdiskusi dan voting di siang hari.")}</p></div><div className="card"><b>{t("Tujuan permainan")}</b><p className="mt-1 text-sm text-slate-400">{t("Desa mencari Werewolf. Werewolf bertahan sampai jumlahnya menguasai desa.")}</p></div></div></section> }

function Players({ game, update, valid, go }: { game: GameState; update: (p: Partial<GameState>) => void; valid: boolean; go: (p: Page) => void }) {
  const change = (i: number, username: string) => update({ players: game.players.map((p, j) => j === i ? { ...p, username } : p) })
  const [count, setCount] = useState(String(game.players.length || 6))
  const resize = (value: string) => {
    setCount(value)
    const size = Number(value)
    if (!Number.isInteger(size) || size < 6 || size > 30 || size === game.players.length) return
    const players = game.players.slice(0, size)
    while (players.length < size) {
      const id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16).padStart(8, '0')).join('')
      players.push({ id, username: '', isAlive: true })
    }
    update({ players })
  }
  useEffect(() => { if (!game.players.length) resize('6') }, [game.players.length])
  const countValid = Number(count) === game.players.length
  const names = game.players.map(p => p.username.trim().toLowerCase())
  return <section>
    <p className="text-sm font-semibold text-violet-400">{t('LANGKAH 1 DARI 3')}</p>
    <h1 className="mt-1 text-3xl font-bold">{t('Siapa yang bermain?')}</h1>
    <label className="card mt-5 flex items-center justify-between gap-2">
      <span>{t('Jumlah pemain')} <small className="text-slate-400">(6–30)</small></span>
      <input className="number" type="number" inputMode="numeric" min={6} max={30} step={1} value={count} onChange={event => resize(event.target.value)} />
    </label>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {game.players.map((player, index) => {
        const label = phrase`Pemain ${index + 1}`
        return <label key={player.id} className="min-w-0">
          <span className="label">{label}</span>
          <input className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 outline-none focus:border-violet-500" value={player.username} placeholder={label} onChange={event => change(index, event.target.value)} />
          {!!names[index] && names.indexOf(names[index]) !== index && <span className="text-xs text-red-400">{t('Nama harus unik.')}</span>}
        </label>
      })}
    </div>
    <div className="sticky bottom-0 mt-5 border-t border-slate-800 bg-slate-950 p-3">
      {(!countValid || !valid) && <p className="mb-2 text-sm text-slate-400">{t(countValid ? 'Lengkapi semua nama dan pastikan tidak ada yang sama.' : 'Masukkan jumlah pemain antara 6 dan 30.')}</p>}
      <button className="btn-primary" disabled={!valid || !countValid} onClick={() => go('roles')}>{t('Lanjutkan ke Role')}</button>
    </div>
  </section>
}

function Roles({ game, update, total, valid, beginDeal, openInfo }: { game: GameState; update: (p: Partial<GameState>) => void; total: number; valid: boolean; beginDeal: () => void; openInfo: (id: RoleId) => void }) {
  const setCount = (id: RoleId, n: number) => { if (n > game.roleConfiguration[id] && total >= game.players.length) return; update({ roleConfiguration: { ...game.roleConfiguration, [id]: Math.max(0, n) } }) }
  const randomize = () => { let left = game.players.length; const c = blankComposition(); c.werewolf = game.players.length >= 10 ? 3 : 2; left -= c.werewolf; const choices: RoleId[] = ['villager', 'villager', 'villager', 'seer', 'guardian', 'hunter', 'tanner']; while (left-- > 0) c[choices[Math.floor(Math.random() * choices.length)]]++; update({ roleConfiguration: c }) }
  return <section><p className="text-sm font-semibold text-violet-400">{t("LANGKAH 2 DARI 3")}</p><h1 className="mt-1 text-3xl font-bold">{t("Atur komposisi role")}</h1><p className="mt-2 text-slate-400">{t("Bebas atur role sesuai keseruan meja kalian.")}</p><div className="mt-5 grid grid-cols-2 gap-2"><button className="btn-secondary !min-h-10 !text-sm" onClick={() => update({ roleConfiguration: recommendedPreset(game.players.length) })}>{t("Pakai Rekomendasi")}</button><button className="btn-secondary !min-h-10 !text-sm" onClick={randomize}><Dices size={17}/> {t("Acak Komposisi")}</button></div><div className="mt-5 space-y-3">{(['Desa', 'Werewolf', 'Netral'] as const).map(team => <section key={team} className="space-y-2"><h2 className="font-bold">{t("Tim")} {team === 'Desa' ? t('Warga') : team}</h2>{roles.filter(role => role.team === team).map(role => <div className="card flex items-center gap-3" key={role.id}><span className="text-violet-300">{iconFor(role.id)}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-1"><b>{roleName(role.name)}</b><button onClick={() => openInfo(role.id)} className="text-slate-500"><CircleHelp size={16}/></button></div><p className="truncate text-xs text-slate-400">{t(role.team)}</p></div><button className="h-9 w-9 rounded-lg bg-slate-800 text-xl disabled:opacity-40" onClick={() => setCount(role.id, game.roleConfiguration[role.id] - 1)} disabled={!game.roleConfiguration[role.id]}>−</button><span className="w-5 text-center font-bold">{game.roleConfiguration[role.id]}</span><button className="h-9 w-9 rounded-lg bg-violet-700 text-xl disabled:opacity-30" disabled={total >= game.players.length} aria-label={phrase`Tambah ${roleName(role.name)}`} onClick={() => setCount(role.id, game.roleConfiguration[role.id] + 1)}>+</button></div>)}</section>)}</div><div className={`mt-5 rounded-xl border p-4 ${valid ? 'border-emerald-800 bg-emerald-950/30' : 'border-amber-800 bg-amber-950/30'}`}><div className="flex justify-between"><b>{t("Total role")}</b><b>{total} / {game.players.length}</b></div><p className="mt-1 text-sm text-slate-400">{valid ? t('Komposisi siap dibagikan.') : total !== game.players.length ? t('Total role harus sama dengan jumlah pemain.') : t('Minimal harus ada 1 Werewolf.')}</p></div><button className="btn-primary mt-4" disabled={!valid} onClick={beginDeal}>{t("Bagikan Role Rahasia")}</button></section>
}

function Deal({ player, position, total, cardOpen, setCardOpen, next }: { player: Player; position: number; total: number; cardOpen: boolean; setCardOpen: (v: boolean) => void; next: () => void }) { const role = roles.find(r => r.id === player.role)!; return <section className="flex min-h-[calc(100vh-8rem)] flex-col justify-center text-center"><p className="text-sm font-semibold text-violet-400">{t("KARTU")} {position} DARI {total}</p>{!cardOpen ? <><h1 className="mt-3 text-3xl font-bold">{t("Giliran")} {player.username}</h1><p className="mx-auto mt-3 max-w-xs text-slate-400">{t("Pastikan pemain lain tidak melihat layar.")}</p><button className="btn-primary mt-8" onClick={() => setCardOpen(true)}><Eye size={20}/> {t("Saya")} {player.username}, Buka Kartu</button></> : <><p className="mt-5 text-slate-400">{t("Role rahasiamu adalah")}</p><div className="card mt-4 border-violet-700 bg-violet-950/50 py-8"><div className="flex justify-center text-violet-300">{iconFor(role.id)}</div><h1 className="mt-3 text-3xl font-black text-violet-100">{roleName(role.name)}</h1><p className="mt-4 px-3 text-sm leading-6 text-slate-300">{t(role.ability ?? '')}</p></div><p className="mt-4 text-xs text-slate-500">{t("Hafalkan role-mu sebelum menyembunyikan kartu.")}</p><button className="btn-primary mt-5" onClick={() => { setCardOpen(false); next() }}><EyeOff size={19}/> {t("Sembunyikan & Oper ke Pemain Berikutnya")}</button></>}</section> }

function SettingsPage({ game, update, go }: { game: GameState; update: (p: Partial<GameState>) => void; go: (p: Page) => void }) { const change = (key: keyof Settings, value: number | boolean) => update({ settings: { ...game.settings, [key]: value } }); return <section><p className="text-sm font-semibold text-violet-400">{t("LANGKAH 3 DARI 3")}</p><h1 className="mt-1 text-3xl font-bold">{t("Pengaturan game")}</h1><p className="mt-2 text-slate-400">{t("Atur waktu untuk membantu moderator menjaga ritme permainan.")}</p><div className="mt-6 space-y-3">{([['dayDuration', t('Diskusi siang'), t('detik')]] as const).map(([key, label, suffix]) => <div className="card flex items-center justify-between" key={key}><label htmlFor={key}><b>{label}</b><span className="ml-2 text-sm text-slate-500">{suffix}</span></label><input id={key} className="number" type="number" min="10" value={game.settings[key]} onChange={e => change(key, Math.max(10, Number(e.target.value)))} /></div>)}<button className="card flex w-full items-center justify-between text-left" onClick={() => change('soundEnabled', !game.settings.soundEnabled)}><span><b>{t("Efek suara")}</b><p className="mt-1 text-sm text-slate-400">{t("Notifikasi pergantian fase")}</p></span>{game.settings.soundEnabled ? <Volume2 className="text-violet-300"/> : <VolumeX className="text-slate-500"/>}</button></div><div className="card mt-5"><b>{t("Ringkasan permainan")}</b><p className="mt-2 text-sm text-slate-400">{game.players.length} pemain · {Object.values(game.roleConfiguration).filter(Boolean).length} jenis role · Role tiap pemain tetap rahasia</p></div><button className="btn-primary mt-5" onClick={() => go('dashboard')}>{t("Masuk Dashboard Moderator")}</button></section> }

function Dashboard({ game, update, fresh }: { game: GameState; update: (p: Partial<GameState> | ((current: GameState) => Partial<GameState>)) => void; fresh: () => void }) {
  const [detail, setDetail] = useState<Player | null>(null)
  const stage = game.night.stage
  const alive = game.players.filter(p => p.isAlive)
  const append = (message: string) => [...game.events, `Ronde ${game.currentRound}: ${message}`]
  const setNight = (patch: Partial<GameState['night']>) => {
    if (patch.timerRunning === false && game.night.timerRunning && patch.timerStartedAt === undefined) { const paused = pauseTimer(game.night.timerRemaining, game.night.timerStartedAt, true); update({ night: { ...game.night, ...patch, timerRemaining: paused.remaining, timerStartedAt: undefined } }); return }
    if (patch.timerRunning === true && !game.night.timerRunning && patch.timerStartedAt === undefined) { update({ night: { ...game.night, ...patch, timerStartedAt: Date.now() } }); return }
    update({ night: { ...game.night, ...patch } })
  }
  const go = (next: typeof stage) => { playCue(game.settings.soundEnabled, 'night'); update(startStage(game, next)) }
  const advance = (from: typeof stage, patch?: Partial<GameState>) => update(current => {
    if (current.night.stage !== from) return {}
    const next = { ...current, ...patch }
    return startStage(next, nextAvailableStage(next, from))
  })
  const selectSeer = (id: string) => update({ night: { ...game.night, seerTarget: id, stage: 'seerResult', timerRunning: false }, events: append(`Seer memeriksa ${nameOf(game, id)}.`) })
  const selectDoctor = (id: string) => setNight({ doctorTarget: id })
  const selectWolf = (id: string) => setNight({ wolfTarget: id, stage: 'wolfConfirm', timerRunning: false })
  const resolve = () => {
    const result = resolveAbilities(game)
    const winner = result.hunters.length ? undefined : checkWinner(result.players)
    playCue(game.settings.soundEnabled, winner ? 'win' : 'morning')
    update({ players: result.players, events: [...game.events, ...result.events], night: { ...game.night, stage: 'morning', timerRunning: false, lastDoctorTarget: game.night.doctorTarget }, day: { ...defaultDay(game.settings.dayDuration), morningVictimId: result.fallen[0], morningVictimIds: result.fallen, hunterSourceId: result.hunters[0], hunterQueue: result.hunters.slice(1), winner }, page: winner ? 'gameOver' : 'morning', currentPhase: winner ? 'Game Over' : 'Pagi' })
  }
  const seerTarget = game.players.find(p => p.id === game.night.seerTarget)
  const outcome = nightOutcome(game)
  const candidates = !alive.some(p => (stage === 'werewolf' ? isWolf(p.role) : p.role === stage)) ? [] : stage === 'seer' ? alive.filter(p => p.role !== 'seer') : stage === 'werewolf' ? alive.filter(p => !isWolf(p.role)) : alive
  return <section><div className="rounded-xl border border-red-900 bg-red-950/50 p-3 text-center text-xs font-bold tracking-wide text-red-200"><ShieldAlert className="mr-1 inline" size={16}/> {t("RAHASIA MODERATOR — JANGAN PERLIHATKAN LAYAR INI KEPADA PEMAIN.")}</div><div className="mt-5 flex items-end justify-between"><div><p className="text-sm font-semibold text-violet-400">{t("DASHBOARD MODERATOR")}</p><h1 className="mt-1 text-2xl font-bold">{t("Ronde")} {game.currentRound}</h1><p className="text-sm text-slate-400">{gameText(game.currentPhase)}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="card p-3"><b className="text-emerald-300">{alive.length}</b><p className="text-xs text-slate-400">{t("Masih hidup")}</p></div><div className="card p-3"><b className="text-red-300">{game.players.length - alive.length}</b><p className="text-xs text-slate-400">{t("Meninggal")}</p></div></div>{stage === 'idle' && <div className="card mt-5"><h2 className="text-xl font-bold">{t("Malam belum dimulai")}</h2><p className="mt-1 text-sm text-slate-400">{t("Aksi tanpa role aktif akan dilewati otomatis.")}</p><button className="btn-primary mt-4" onClick={() => go(nextAvailableStage(game, 'idle'))}><Moon size={19}/> {t("Mulai Fase Malam")}</button></div>}{stage === 'seer' && <NightAction title={t("SEER BANGUN")} help={t("Minta Seer membuka mata, lalu pilih pemain yang diperiksa.")} candidates={candidates} onSelect={selectSeer} onEmpty={() => advance('seer')} />}{stage === 'seerResult' && <div className="card mt-5"><p className="text-sm text-violet-300">{t("HASIL PEMERIKSAAN RAHASIA")}</p><h2 className="mt-2 text-xl font-bold">{seerTarget?.username} {seerTarget?.role === 'werewolf' || seerTarget?.role === 'wolfcub' ? t('adalah Werewolf.') : t('terbaca sebagai Warga Desa.')}</h2><button className="btn-primary mt-5" onClick={() => advance('seerResult')}>{t("Seer Tidur — Lanjutkan")}</button></div>}{stage === 'guardian' && <NightAction title={t('GUARDIAN BANGUN')} help={t('Guardian boleh melindungi dirinya sendiri.')} candidates={candidates} selected={game.night.doctorTarget} onSelect={selectDoctor} onEmpty={() => advance('guardian', { night: { ...game.night, doctorTarget: undefined } })} confirmLabel={t("Guardian Tidur — Lanjutkan")} confirm={() => update({ ...startStage(game, nextAvailableStage(game, 'guardian')), events: game.night.doctorTarget ? append(`Guardian melindungi ${nameOf(game, game.night.doctorTarget)}.`) : game.events })} />}{stage === 'werewolf' && <NightAction title={t("WEREWOLF BANGUN")} help={t("Werewolf berdiskusi lalu moderator memilih satu korban.")} candidates={candidates} onSelect={selectWolf} onEmpty={() => advance('werewolf')} />}{stage === 'wolfConfirm' && <div className="card mt-5"><p className="text-sm text-violet-300">{t("KONFIRMASI SERANGAN")}</p><h2 className="mt-2 text-xl font-bold">{t("Apakah Werewolf sepakat menyerang")} {nameOf(game, game.night.wolfTarget)}?</h2><div className="mt-5 grid grid-cols-2 gap-2"><button className="btn-secondary" onClick={() => setNight({ stage: 'werewolf', wolfTarget: undefined })}>{t("Ubah Target")}</button><button className="btn-primary" onClick={() => update({ ...startStage(game, nextAvailableStage(game, 'werewolf')), events: append(`Werewolf memilih ${nameOf(game, game.night.wolfTarget)} sebagai target.`) })}>{t("Konfirmasi Serangan")}</button></div></div>}<SpecialNight key={`special-${stage}`} game={game} update={update} advance={patch => advance(stage, patch)} />{stage === 'resolution' && <div className="card mt-5"><p className="text-sm text-violet-300">{t("RINGKASAN RAHASIA MODERATOR")}</p><div className="mt-3 space-y-2 text-sm text-slate-300"><p>{t("Target serangan:")} <b>{[game.night.wolfTarget, game.night.secondWolfTarget].filter(Boolean).map(id => nameOf(game, id)).join(', ') || '—'}</b></p><p>{t("Target perlindungan:")} <b>{nameOf(game, game.night.doctorTarget)}</b></p><p className={outcome.saved ? 'text-emerald-300' : 'text-red-300'}><b>{t("Hasil:")} {resolveAbilities(game).fallen.map(id => nameOf(game, id)).join(', ') || t('Tidak ada korban.')}</b></p></div><button className="btn-primary mt-5" onClick={resolve}>{t("Konfirmasi Hasil Malam")}</button></div>}{stage === 'morning' && <div className="card mt-5 border-emerald-800"><h2 className="text-xl font-bold">{t("Hasil malam sudah siap")}</h2><p className="mt-1 text-sm text-slate-400">{t("Informasi rahasia tersimpan di log moderator. Anda dapat mengumumkan hasil pada pagi hari.")}</p><button className="btn-primary mt-4" onClick={() => update({ currentRound: game.currentRound + 1, currentPhase: 'Siang hari', night: defaultNight(game.settings.nightDuration) })}>{t("Tutup Malam")}</button></div>}<div className="mt-6"><h2 className="font-bold">{t("Pemain")}</h2><div className="mt-2 space-y-2">{game.players.map(p => <button key={p.id} onClick={() => setDetail(p)} className={`card flex w-full items-center justify-between gap-2 py-3 text-left ${teamColors[teamOf(p.role) ?? 'Netral']}`}><span className="min-w-0 break-words"><b>{p.username}</b><span className="ml-2 text-sm text-violet-300">{roleName(roles.find(r => r.id === p.role)?.name)}</span></span><span className={p.isAlive ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>{p.isAlive ? t('● Hidup') : t('● Mati')}</span></button>)}</div></div><div className="mt-6"><h2 className="font-bold">{t("Riwayat kejadian rahasia")}</h2><div className="card mt-2 max-h-40 space-y-2 overflow-auto text-sm text-slate-400">{game.events.length ? game.events.slice().reverse().map((event, i) => <p key={i}>{gameText(event)}</p>) : <p>{t("Belum ada kejadian.")}</p>}</div></div><button className="btn-secondary mt-7" onClick={fresh}>{t("Akhiri & Mulai Game Baru")}</button>{detail && <div className="fixed inset-0 z-20 flex items-end bg-black/70 p-4"><div className="card mx-auto w-full max-w-md"><div className="flex justify-between"><h2 className="text-xl font-bold">{detail.username}</h2><button onClick={() => setDetail(null)}><X/></button></div><p className="mt-3 text-violet-300">Role: {roleName(roles.find(r => r.id === detail.role)?.name)}</p><p className={detail.isAlive ? 'mt-2 text-emerald-400' : 'mt-2 text-red-400'}>{t("Status:")} {detail.isAlive ? t('Hidup') : t('Mati')}</p><button className="btn-primary mt-5" onClick={() => setDetail(null)}>{t("Tutup")}</button></div></div>}</section>
}

function Morning({ game, go }: { game: GameState; go: (p: Page) => void }) {
  const victim = playerById(game, game.day.morningVictimId)
  const needsHunter = Boolean(game.day.hunterSourceId || victim?.role === 'hunter')
  const victims = (game.day.morningVictimIds ?? (victim ? [victim.id] : [])).map(id => nameOf(game, id))
  return <section className="flex min-h-[calc(100vh-7rem)] flex-col justify-center text-center"><p className="text-sm font-bold tracking-[.2em] text-amber-300">{t("RONDE")} {game.currentRound}</p><h1 className="mt-3 text-4xl font-black text-amber-100">{t("PAGI TELAH TIBA")}</h1><div className="card mt-8"><p className="text-lg leading-7">{victims.length ? <>{t("Semalam,")} <b>{victims.join(', ')}</b> {t("ditemukan tereliminasi.")}</> : t('Semalam tidak ada pemain yang tereliminasi.')}</p><p className="mt-4 text-sm text-slate-400">{t("Moderator menyimpan detail permainan secara rahasia.")}</p></div><button className="btn-primary mt-7" onClick={() => go(needsHunter ? 'hunter' : 'discussion')}>{needsHunter ? t('Lanjutkan ke Aksi Hunter') : t('Mulai Diskusi Siang')}</button></section>
}

function Discussion({ game, update, go }: { game: GameState; update: (p: Partial<GameState> | ((current: GameState) => Partial<GameState>)) => void; go: (p: Page) => void }) {
  const [, rerender] = useState(0)
  useEffect(() => { if (!game.day.discussionRunning) return; const id = window.setInterval(() => rerender(n => n + 1), 1000); return () => window.clearInterval(id) }, [game.day.discussionRunning])
  const discussionSeconds = remainingTime(game.day.discussionRemaining, game.day.discussionStartedAt, game.day.discussionRunning)
  const time = `${String(Math.floor(discussionSeconds / 60)).padStart(2, '0')}:${String(discussionSeconds % 60).padStart(2, '0')}`
  const finished = discussionSeconds === 0
  const toggle = () => { if (game.day.discussionRunning) { const paused = pauseTimer(game.day.discussionRemaining, game.day.discussionStartedAt, true); update({ day: { ...game.day, discussionRemaining: paused.remaining, discussionRunning: false, discussionStartedAt: undefined } }) } else if (game.day.discussionRemaining > 0) update({ day: { ...game.day, discussionRunning: true, discussionStartedAt: Date.now() } }) }
  return <section className="text-center"><p className="text-sm font-bold text-amber-300">{t("RONDE")} {game.currentRound}</p><h1 className="mt-2 text-3xl font-black">{t("Diskusi Siang")}</h1><p className="mt-2 text-slate-400">{t("Diskusikan langsung di meja, lalu tentukan siapa yang dicurigai.")}</p><div className={`mt-8 rounded-3xl border p-7 font-mono text-6xl font-black ${discussionSeconds <= 10 ? 'border-red-500 bg-red-950/40 text-red-200' : 'border-violet-700 bg-slate-900 text-violet-100'}`}>{time}</div><div className="mt-4 grid grid-cols-3 gap-2"><button className="btn-secondary" onClick={toggle}>{game.day.discussionRunning ? <><Pause size={17}/> {t("Jeda")}</> : <><Play size={17}/> {t("Mulai")}</>}</button><button className="btn-secondary" onClick={() => update({ day: { ...game.day, discussionRemaining: game.settings.dayDuration, discussionRunning: false, discussionStartedAt: undefined } })}>Reset</button><button className="btn-secondary" onClick={() => go('voting')}>{t("Lewati")}</button></div>{finished && <button className="btn-primary mt-5" onClick={() => go('voting')}>{t("Catat Keputusan Meja")}</button>}<div className="card mt-6 text-left"><b>{t("Pemain yang masih hidup")}</b><div className="mt-3 flex flex-wrap gap-2">{alivePlayers(game).map(p => <span key={p.id} className="rounded-lg bg-slate-800 px-2 py-1 text-sm">{p.username}</span>)}</div></div></section>
}

function Voting({ game, update, go }: { game: GameState; update: (p: Partial<GameState> | ((current: GameState) => Partial<GameState>)) => void; go: (p: Page) => void }) {
  const [choice, setChoice] = useState<string | 'skip'>(game.day.pendingEliminationId ?? 'skip')
  const decide = () => { update({ day: { ...game.day, pendingEliminationId: choice === 'skip' ? undefined : choice }, page: 'voteResult', events: [...game.events, `Siang ${game.currentRound}: meja memutuskan ${choice === 'skip' ? 'melewati eliminasi' : `eliminasi ${playerById(game, choice)?.username}`}.`] }) }
  return <section><div className="rounded-xl border border-red-900 bg-red-950/50 p-3 text-center text-xs font-bold text-red-200">{t("RAHASIA MODERATOR — KEPUTUSAN MEJA")}</div><p className="mt-5 text-sm font-bold text-violet-400">{t("SETELAH DISKUSI")}</p><h1 className="mt-2 text-3xl font-bold">{t("Pilih keputusan hari ini")}</h1><p className="mt-2 text-slate-400">{t("Pemain sudah berdiskusi di meja. Moderator cukup mencatat hasil kesepakatan.")}</p><div className="mt-5 space-y-2">{alivePlayers(game).map(player => <button key={player.id} onClick={() => setChoice(player.id)} className={`flex w-full justify-between rounded-xl border p-4 text-left ${choice === player.id ? 'border-violet-500 bg-violet-950' : 'border-slate-700 bg-slate-900'}`}><span>{t("Eliminasi")} {player.username}</span>{choice === player.id && <span>✓</span>}</button>)}<button onClick={() => setChoice('skip')} className={`w-full rounded-xl border p-4 text-left ${choice === 'skip' ? 'border-amber-500 bg-amber-950/40' : 'border-slate-700 bg-slate-900'}`}>{t("Lewati eliminasi hari ini")}</button></div><button className="btn-primary mt-5" onClick={decide}>{t("Lanjutkan ke Konfirmasi")}</button></section>
}

function VoteResult({ game, update, go }: { game: GameState; update: (p: Partial<GameState> | ((current: GameState) => Partial<GameState>)) => void; go: (p: Page) => void }) {
  const candidate = playerById(game, game.day.pendingEliminationId)
  const confirm = () => { if (!candidate) { const winner = checkWinner(game.players); update({ day: { ...game.day, winner }, page: winner ? 'gameOver' : 'dashboard', currentPhase: winner ? 'Game Over' : 'Malam berikutnya', currentRound: winner ? game.currentRound : game.currentRound + 1, night: winner ? game.night : { ...defaultNight(game.settings.nightDuration), lastDoctorTarget: game.night.lastDoctorTarget } }); return } const result = eliminate(game, [{ id: candidate.id, cause: 'Voting siang' }]); const players = result.players; const tannerWin = candidate.role === 'tanner'; const normalWinner = result.hunters.length ? undefined : checkWinner(players); const winner = tannerWin ? `${candidate.username} (Tanner) menang sendiri karena berhasil dieliminasi melalui keputusan siang.` : normalWinner; const event = `Siang ${game.currentRound}: ${candidate.username} dieliminasi berdasarkan keputusan meja.`; update({ players, day: { ...game.day, winner, hunterSourceId: result.hunters[0], hunterQueue: result.hunters.slice(1) }, events: [...game.events, ...result.events], page: winner ? 'gameOver' : result.hunters.length > 0 ? 'hunter' : 'dashboard', currentPhase: winner ? 'Game Over' : result.hunters.length > 0 ? 'Aksi Hunter' : 'Malam berikutnya', currentRound: winner || result.hunters.length > 0 ? game.currentRound : game.currentRound + 1, night: { ...defaultNight(game.settings.nightDuration), lastDoctorTarget: game.night.lastDoctorTarget } }) }
  return <section><div className="rounded-xl border border-red-900 bg-red-950/50 p-3 text-center text-xs font-bold text-red-200">{t("RAHASIA MODERATOR — KONFIRMASI KEPUTUSAN")}</div><h1 className="mt-5 text-3xl font-bold">{t("Keputusan Siang")}</h1><div className="card mt-5"><b>{candidate ? phrase`${candidate.username} akan dieliminasi.` : t('Tidak ada pemain yang dieliminasi hari ini.')}</b><p className="mt-2 text-sm text-slate-400">{t("Perubahan status baru diterapkan setelah moderator mengonfirmasi.")}</p></div><button className="btn-primary mt-5" onClick={confirm}>{candidate ? phrase`Konfirmasi Eliminasi ${candidate.username}` : t('Konfirmasi Lewati Eliminasi')}</button><button className="btn-secondary mt-2" onClick={() => go('voting')}>{t("Kembali")}</button></section>
}

function Hunter({ game, update, go }: { game: GameState; update: (p: Partial<GameState> | ((current: GameState) => Partial<GameState>)) => void; go: (p: Page) => void }) {
  const hunter = playerById(game, game.day.hunterSourceId ?? game.day.morningVictimId); const [targetId, setTargetId] = useState<string>(); const candidates = alivePlayers(game)
  const finish = (target?: Player) => {
    const result = eliminate(game, target ? [{ id: target.id, cause: 'Efek Hunter' }] : [])
    const [nextHunter, ...hunterQueue] = [...(game.day.hunterQueue ?? []), ...result.hunters]
    const winner = nextHunter ? undefined : checkWinner(result.players)
    update({ players: result.players, events: [...game.events, ...result.events], day: { ...game.day, winner, hunterSourceId: nextHunter, hunterQueue }, page: nextHunter ? 'hunter' : winner ? 'gameOver' : 'dashboard', currentPhase: nextHunter ? 'Aksi Hunter' : winner ? 'Game Over' : 'Malam berikutnya', currentRound: winner || nextHunter ? game.currentRound : game.currentRound + 1, night: winner || nextHunter ? game.night : { ...defaultNight(game.settings.nightDuration), lastDoctorTarget: game.night.lastDoctorTarget } })
    setTargetId(undefined)
  }
  return <section><div className="rounded-xl border border-red-900 bg-red-950/50 p-3 text-center text-xs font-bold text-red-200">{t("RAHASIA MODERATOR")}</div><h1 className="mt-5 text-3xl font-bold">{t("HUNTER TERELIMINASI")}</h1><p className="mt-2 text-slate-400">{hunter?.username} dapat membawa satu pemain hidup bersamanya.</p><div className="mt-5 space-y-2">{candidates.map(p => <button key={p.id} onClick={() => setTargetId(p.id)} className={`w-full rounded-xl border p-4 text-left ${targetId === p.id ? 'border-violet-500 bg-violet-950' : 'border-slate-700 bg-slate-900'}`}>{p.username}</button>)}</div><button className="btn-primary mt-5" disabled={!targetId} onClick={() => finish(candidates.find(p => p.id === targetId))}><Target size={18}/> {t("Konfirmasi Tembakan Hunter")}</button><button className="btn-secondary mt-2" onClick={() => finish()}>{t("Tidak Menembak")}</button></section>
}

function GameOver({ game, fresh, replay }: { game: GameState; fresh: () => void; replay: (changePlayers?: boolean) => void }) { return <section className="py-4 text-center"><p className="text-sm font-bold tracking-[.2em] text-violet-400">GAME OVER</p><h1 className="mt-3 text-3xl font-black text-violet-100">{gameText(game.day.winner ?? 'Permainan selesai.')}</h1><p className="mt-2 text-slate-400">{t("Berakhir pada ronde")} {game.currentRound}</p><div className="card mt-7 text-left"><b>{t("Pengungkapan role")}</b><div className="mt-3 space-y-2">{game.players.map(player => <div className="flex items-center justify-between border-b border-slate-800 pb-2 last:border-0" key={player.id}><span><b>{player.username}</b><span className="ml-2 text-sm text-violet-300">{roles.find(role => role.id === (player.originalRole ?? player.role))?.name}{player.originalRole && ` → ${roles.find(role => role.id === player.role)?.name}`}</span></span><span className={player.isAlive ? 'text-xs text-emerald-400' : 'text-right text-xs text-red-400'}>{player.isAlive ? t('Hidup') : <>{t(player.eliminatedBy ?? '')}<br/>{t("Ronde")} {player.eliminatedRound}</>}</span></div>)}</div></div><div className="card mt-4 text-left"><b>{t("Riwayat permainan")}</b><div className="mt-3 max-h-48 space-y-2 overflow-auto text-sm text-slate-400">{game.events.slice().reverse().map((e, i) => <p key={i}>{gameText(e)}</p>)}</div></div><div className="mt-6 space-y-2"><button className="btn-primary" onClick={() => replay(false)}><RotateCcw size={18}/> {t("Main Lagi dengan Pemain Sama")}</button><button className="btn-secondary" onClick={() => replay(true)}><Users size={18}/> {t("Ubah Pemain")}</button><button className="btn-secondary" onClick={fresh}>{t("Mulai Permainan Baru")}</button></div></section> }

const teamColors = { Desa: '!border-emerald-700/70 !bg-emerald-950/50', Werewolf: '!border-red-700/70 !bg-red-950/50', Netral: '!border-amber-700/70 !bg-amber-950/50' }

function NightAction({ title, help, candidates, selected, onSelect, onEmpty, confirm, confirmLabel }: {
  title: string; help: string; candidates: Player[]; selected?: string
  onSelect: (id: string) => void; onEmpty: () => void; confirm?: () => void; confirmLabel?: string
}) {
  const [draft, setDraft] = useState<string>()
  const choice = confirm ? selected : draft
  const eligible = candidates.some(player => player.id === choice)
  return <div className="card mt-5">
    <p className="text-sm font-semibold text-violet-300">{title}</p>
    <p className="mt-2 text-sm text-slate-400">{help}</p>
    <div className="mt-4 space-y-2">
      {!candidates.length && <p className="text-sm text-slate-400">{t('Tidak ada target yang dapat dipilih. Bacakan instruksi seperti biasa, lalu lanjutkan.')}</p>}
      {candidates.map(player => <button key={player.id} aria-pressed={choice === player.id} onClick={() => confirm ? onSelect(player.id) : setDraft(player.id)} className={choice === player.id ? 'btn-secondary !border-cyan-400 !bg-cyan-950 text-cyan-100' : 'btn-secondary'}>{player.username}</button>)}
    </div>
    <div className="mt-4">
      {!!candidates.length && <button className="btn-primary !px-2 text-sm" disabled={!eligible} onClick={() => { if (!eligible || !choice) return; if (confirm) confirm(); else onSelect(choice) }}>{confirmLabel ?? t('Konfirmasi Pilihan')}</button>}
      {!candidates.length && <button className="btn-secondary" onClick={onEmpty}>{t('Lanjutkan')}</button>}
    </div>
  </div>
}

function RoleModal({ role, close }: { role: typeof roles[number]; close: () => void }) { return <div className="fixed inset-0 z-10 flex items-end bg-black/70 p-4 sm:items-center"><div className="mx-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5"><div className="flex items-start justify-between"><div><div className="flex gap-2 text-violet-300">{iconFor(role.id)}<h2 className="text-xl font-bold text-white">{roleName(role.name)}</h2></div><p className="mt-1 text-sm text-slate-400">{t("Tim")} {t(role.team)}</p></div><button onClick={close} className="text-slate-400"><X/></button></div><p className="mt-5 leading-6 text-slate-300">{t(role.description ?? '')}</p><div className="mt-4 rounded-xl bg-slate-800 p-3 text-sm text-violet-100"><b>{t("Kemampuan:")}</b> {t(role.ability ?? '')}</div><button className="btn-primary mt-5" onClick={close}>{t("Mengerti")}</button></div></div> }
