import { useEffect, useState } from 'react'
import { defaultPairs, canStart, normalizeWord, shuffle, winnerOf, finalWhiteIndex, type Pair, type UndercoverPlayer, type UndercoverRole } from './undercoverGame'
import { languageKey } from './language'

type Phase = 'deal' | 'clues' | 'vote' | 'reveal' | 'guess' | 'over'
interface Session {
  players: UndercoverPlayer[]
  words: Pair
  phase: Phase
  card: number
  round: number
  order: number[]
  eliminated?: number
  winner?: string
}

const sessionKey = 'undercover-session-v1'
const pairsKey = 'undercover-pairs-v1'
function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}

function enterFinalGuess(game: Session): Session {
  const white = finalWhiteIndex(game.players)
  if (white === -1) return game
  return { ...game, phase: 'guess', eliminated: white, players: game.players.map((player, i) => i === white ? { ...player, alive: false } : player) }
}

export default function Undercover() {
  const [en, setEnglish] = useState(localStorage.getItem(languageKey) === 'en')
  const l = (id: string, english: string) => en ? english : id
  const [names, setNames] = useState(['', '', '', '', ''])
  const [roles, setRoles] = useState({ civilian: '3', undercover: '1', white: '1' })
  const [countInput, setCountInput] = useState('5')
  const [custom, setCustom] = useState(() => load<Pair[]>(pairsKey, []))
  const [pair, setPair] = useState<Pair>(['', ''])
  const [pairFeedback, setPairFeedback] = useState<'saved' | 'invalid' | 'duplicate'>()
  const [session, setSession] = useState(() => {
    const saved = load<Session | null>(sessionKey, null)
    return saved && (saved.phase === 'clues' || saved.phase === 'vote') ? enterFinalGuess(saved) : saved
  })
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<number>()
  const [guess, setGuess] = useState('')
  const [keepNames, setKeepNames] = useState<string[]>([])
  useEffect(() => { localStorage.setItem(sessionKey, JSON.stringify(session)) }, [session])
  useEffect(() => { localStorage.setItem(pairsKey, JSON.stringify(custom)) }, [custom])

  const civilians = Number(roles.civilian)
  const undercover = Number(roles.undercover)
  const white = Number(roles.white)
  const valid = Number(countInput) === names.length && Object.values(roles).every(value => value !== '')
    && civilians + undercover + white === names.length && canStart(names, undercover, white)
  const start = () => {
    if (!valid) return
    const roles = shuffle<UndercoverRole>([
      ...Array<UndercoverRole>(civilians).fill('Civilian'),
      ...Array<UndercoverRole>(undercover).fill('Undercover'),
      ...Array<UndercoverRole>(white).fill('Mr. White'),
    ])
    const players = names.map((name, index) => ({ name: name.trim(), role: roles[index], alive: true }))
    const pool = [...defaultPairs, ...custom]
    setOpen(false)
    setSelected(undefined)
    setGuess('')
    setSession({ players, words: pool[Math.floor(Math.random() * pool.length)], phase: 'deal', card: 0, round: 1, order: shuffle(players.map((_, i) => i)) })
  }
  const savePair = () => {
    const cleaned: Pair = [pair[0].trim(), pair[1].trim()]
    const words = cleaned.map(normalizeWord)
    if (words.some(word => !word) || words[0] === words[1]) { setPairFeedback('invalid'); return }
    if ([...defaultPairs, ...custom].some(existing => existing.map(normalizeWord).sort().join('\u0000') === [...words].sort().join('\u0000'))) {
      setPairFeedback('duplicate')
      return
    }
    setCustom([...custom, cleaned])
    setPair(['', ''])
    setPairFeedback('saved')
  }
  const editSetup = () => {
    if (session) {
      setNames(session.players.map(player => player.name))
      setCountInput(String(session.players.length))
      setRoles({
        civilian: String(session.players.filter(player => player.role === 'Civilian').length),
        undercover: String(session.players.filter(player => player.role === 'Undercover').length),
        white: String(session.players.filter(player => player.role === 'Mr. White').length),
      })
      setSession(null)
    }
    setOpen(false)
  }
  const afterReveal = (game: Session) => {
    const winner = winnerOf(game.players)
    if (winner) {
      setSession({ ...game, phase: 'over', winner })
      return
    }
    const finalGuess = enterFinalGuess(game)
    if (finalGuess !== game) {
      setGuess('')
      setSession(finalGuess)
      return
    }
    setSession({ ...game, phase: 'clues', round: game.round + 1, order: shuffle(game.order.filter(i => game.players[i].alive)) })
  }
  const vote = (game: Session) => {
    if (selected === undefined || !game.players[selected]?.alive) return
    setSession({ ...game, phase: 'reveal', eliminated: selected, players: game.players.map((player, i) => i === selected ? { ...player, alive: false } : player) })
    setSelected(undefined)
    setGuess('')
  }

  return <main className="app">
    <header className="mb-5 flex items-center justify-between gap-3">
      {!session && <a className="rounded-lg py-3 text-sm text-cyan-200" href="#games">← {l('Menu game', 'Game menu')}</a>}
      <select aria-label={l('Bahasa', 'Language')} className="ml-auto rounded-lg bg-slate-800 p-2" value={en ? 'en' : 'id'} onChange={event => {
        localStorage.setItem(languageKey, event.target.value)
        setEnglish(event.target.value === 'en')
      }}><option value="id">Indonesia</option><option value="en">English</option></select>
    </header>
    {!session && <section className="space-y-5">
      <h1 className="text-4xl font-black">Undercover</h1>
      <label className="card block">
        <span className="flex items-center justify-between gap-3">
          <span className="font-semibold">{l('Jumlah pemain', 'Number of players')}</span>
          <output className="rounded-lg bg-cyan-950 px-3 py-1 font-bold tabular-nums text-cyan-200">{countInput}</output>
        </span>
        <input aria-label={l('Jumlah pemain', 'Number of players')} className="mt-2 h-12 w-full cursor-pointer accent-cyan-400" type="range" min={3} max={20} step={1} value={countInput} onChange={event => {
          const value = event.target.value
          setCountInput(value)
          const count = Number(value)
          if (!Number.isInteger(count) || count < 3 || count > 20) return
          const history = [...keepNames]
          names.forEach((name, i) => { history[i] = name })
          setKeepNames(history)
          setNames(Array.from({ length: count }, (_, i) => history[i] ?? ''))
        }} />
        <span className="flex justify-between text-sm text-slate-300"><span>{l('Min. 3 pemain', 'Min. 3 players')}</span><span>{l('Maks. 20 pemain', 'Max. 20 players')}</span></span>
      </label>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {names.map((name, i) => <label key={i} className="label">
          {l('Pemain', 'Player')} {i + 1}
          <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3" placeholder={l('masukkan nama', 'enter name')} value={name} maxLength={32} onChange={event => setNames(names.map((value, index) => index === i ? event.target.value : value))} />
        </label>)}
      </div>
      <div className="card space-y-3">
        {([['civilian', 'Civilian'], ['undercover', 'Undercover'], ['white', 'Mr. White']] as const).map(([key, label]) => {
          const count = Number(roles[key])
          const total = civilians + undercover + white
          const adjust = (delta: number) => setRoles(previous => ({ ...previous, [key]: String(Number(previous[key]) + delta) }))
          return <div key={key} className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
            <button type="button" className="btn-secondary !px-0 text-xl" aria-label={`${l('Kurangi', 'Remove')} ${label}`} disabled={count <= (key === 'civilian' ? 1 : 0)} onClick={() => adjust(-1)}>−</button>
            <span className="rounded-xl bg-slate-800 px-2 py-3 text-center font-semibold tabular-nums">{count} {label}</span>
            <button type="button" className="btn-secondary !px-0 text-xl" aria-label={`${l('Tambah', 'Add')} ${label}`} disabled={total >= names.length} onClick={() => adjust(1)}>+</button>
          </div>
        })}
        <p className="text-sm text-slate-300">{l('Total Civilian, Undercover, dan Mr. White harus sama dengan jumlah pemain.', 'The total number of Civilians, Undercover players, and Mr. Whites must match the player count.')}</p>
        <p aria-live="polite" className={civilians + undercover + white === names.length ? 'text-sm text-cyan-200' : 'text-sm text-amber-200'}>{l('Jumlah role', 'Assigned roles')} {civilians + undercover + white}/{names.length}</p>
        <p className="text-sm text-slate-300">{l('Isi nama unik. Gunakan minimal satu penyusup, dengan jumlah Civilian lebih banyak daripada penyusup.', 'Enter unique names. Include at least one infiltrator and more Civilians than infiltrators.')}</p>
      </div>
      <details className="card">
        <summary className="cursor-pointer font-semibold">{l('Pasangan kata', 'Word pairs')} · {defaultPairs.length + custom.length}</summary>
        <p className="my-3 text-sm text-slate-300">{l('Pasangan dipilih acak. Tambahkan dua kata berbeda agar ikut masuk undian.', 'A pair is drawn at random. Add two distinct words to include them in the pool.')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {pair.map((word, i) => <label key={i} className="label">{i === 0 ? l('Kata Civilian', 'Civilian word') : l('Kata Undercover', 'Undercover word')}
            <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" maxLength={48} value={word} onChange={event => {
              setPairFeedback(undefined)
              setPair(i === 0 ? [event.target.value, pair[1]] : [pair[0], event.target.value])
            }} />
          </label>)}
        </div>
        <button className="btn-secondary mt-2" onClick={savePair}>{l('Tambah pasangan', 'Add pair')}</button>
        <button className="btn-secondary mt-2" disabled={!custom.length} onClick={() => {
          if (!window.confirm(l('Hapus pasangan tambahan dan kembali ke 50 pasangan bawaan?', 'Remove custom pairs and restore the 50 default pairs?'))) return
          setCustom([])
          setPair(['', ''])
          setPairFeedback(undefined)
        }}>{l('Reset ke 50 pasangan', 'Restore 50 default pairs')}</button>
        <p role="status" className="mt-2 text-sm text-cyan-200">{pairFeedback === 'saved' ? l('Pasangan tersimpan.', 'Pair saved.') : pairFeedback === 'duplicate' ? l('Pasangan sudah tersedia.', 'This pair already exists.') : pairFeedback === 'invalid' ? l('Masukkan dua kata berbeda.', 'Enter two distinct words.') : ''}</p>
      </details>
      <button className="btn-primary" disabled={!valid} onClick={start}>{l('Bagikan Kartu', 'Deal Cards')}</button>
    </section>}
    {session?.phase === 'deal' && <section className="card mx-auto mt-8 max-w-md space-y-4 text-center">
      <p className="text-sm font-semibold text-cyan-300">{l('Kartu', 'Card')} {session.card + 1}/{session.players.length}</p>
      <h1 className="text-2xl font-bold">{session.players[session.card].name}</h1>
      {open ? <>
        <p className="text-3xl font-black text-cyan-200">{session.players[session.card].role === 'Mr. White' ? 'Mr. White' : session.words[session.players[session.card].role === 'Undercover' ? 1 : 0]}</p>
        {session.players[session.card].role === 'Mr. White' && <p>{l('Simak petunjuk pemain lain untuk menebak kata Warga.', 'Listen to the other clues to guess the Civilians’ word.')}</p>}
        <button className="btn-primary" onClick={() => {
          setOpen(false)
          setSession(session.card + 1 === session.players.length ? { ...session, phase: 'clues' } : { ...session, card: session.card + 1 })
        }}>{l('Sembunyikan & Oper', 'Hide & Pass')}</button>
      </> : <>
        <p className="text-slate-300">{l('Pastikan hanya pemain ini yang melihat layar.', 'Only this player should see the screen.')}</p>
        <button className="btn-primary" onClick={() => setOpen(true)}>{l('Buka Kartu Rahasia', 'Reveal Secret Card')}</button>
      </>}
    </section>}
    {session && (session.phase === 'clues' || session.phase === 'vote') && <section className="space-y-5">
      <div className="rounded-2xl border border-cyan-800 bg-cyan-950/60 p-4">
        <p className="text-sm text-cyan-300">{l('Ronde', 'Round')} {session.round}</p>
        <h1 className="text-3xl font-bold">{session.phase === 'clues' ? l('Waktunya Beri Petunjuk', 'Clue Time') : l('Pilih Pemain', 'Choose a Player')}</h1>
        <p className="mt-2 text-slate-300">{session.phase === 'clues' ? l('Ikuti urutan nomor dan beri satu petunjuk tanpa menyebut kata rahasia.', 'Follow the numbered order and give one clue without saying the secret word.') : l('Diskusikan pilihan di meja. Pilih satu pemain untuk dieliminasi.', 'Discuss at the table. Choose one player to eliminate.')}</p>
      </div>
      <p className="text-sm text-slate-300">{l('Penyusup tersisa', 'Remaining infiltrators')} · Undercover {session.players.filter(p => p.alive && p.role === 'Undercover').length} · Mr. White {session.players.filter(p => p.alive && p.role === 'Mr. White').length}</p>
      <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
        {session.order.map((id, index) => {
          const player = session.players[id]
          const tile = <><span className="relative mx-auto grid size-12 place-items-center rounded-2xl bg-cyan-950 text-lg font-black text-cyan-200">{player.name.slice(0, 2).toUpperCase()}<span className="absolute -right-1 -top-1 rounded-md bg-violet-700 px-1.5 text-xs text-white">{index + 1}</span></span><span className="block break-words text-sm">{player.name}</span></>
          return session.phase === 'vote'
            ? <button key={id} onClick={() => setSelected(id)} aria-pressed={selected === id} className={`min-w-0 space-y-2 rounded-xl border p-2 text-center ${selected === id ? 'border-amber-300 bg-amber-950' : 'border-slate-700 bg-slate-900'}`}>{tile}</button>
            : <div key={id} className="min-w-0 space-y-2 rounded-xl border border-slate-700 bg-slate-900 p-2 text-center">{tile}</div>
        })}
      </div>
      <div className="sticky bottom-0 grid gap-2 bg-slate-950/95 py-3">
        {session.phase === 'clues' ? <button className="btn-primary" onClick={() => setSession({ ...session, phase: 'vote' })}>{l('Mulai Voting', 'Go to Vote')}</button> : <>
          <button className="btn-primary" disabled={selected === undefined} onClick={() => vote(session)}>{l('Konfirmasi Eliminasi', 'Confirm Elimination')}</button>
        </>}
      </div>
    </section>}
    {session && session.eliminated !== undefined && (session.phase === 'reveal' || session.phase === 'guess') && <section className="card space-y-4 text-center">
      <h1 className="text-2xl font-bold">{session.players[session.eliminated].name} · {session.players[session.eliminated].role}</h1>
      {session.phase === 'guess' ? <form className="space-y-3" onSubmit={event => {
        event.preventDefault()
        if (!guess.trim()) return
        if (normalizeWord(guess) === normalizeWord(session.words[0])) setSession({ ...session, phase: 'over', winner: 'Mr. White' })
        else afterReveal(session)
      }}>
        <label className="label">{l('Mr. White, tebak kata Civilian.', 'Mr. White, guess the Civilians’ word.')}
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" value={guess} onChange={event => setGuess(event.target.value)} autoComplete="off" />
        </label>
        <button className="btn-primary" disabled={!guess.trim()}>{l('Kunci Tebakan', 'Submit Guess')}</button>
      </form> : <button className="btn-primary" onClick={() => session.players[session.eliminated!].role === 'Mr. White' ? setSession({ ...session, phase: 'guess' }) : afterReveal(session)}>
        {session.players[session.eliminated].role === 'Mr. White' ? l('Tebak Kata', 'Guess the Word') : l('Lanjutkan', 'Continue')}
      </button>}
    </section>}
    {session?.phase === 'over' && <section className="card space-y-4">
      <h1 className="text-3xl font-black">{session.winner === 'Infiltrator' ? 'Undercover' : session.winner} {l('menang!', 'wins!')}</h1>
      <p>Civilian: <strong>{session.words[0]}</strong> · Undercover: <strong>{session.words[1]}</strong></p>
      <ul className="grid gap-2 sm:grid-cols-2">{session.players.map(player => <li key={player.name} className="rounded-lg bg-slate-950 p-2">{player.name} · {player.role}</li>)}</ul>
      <button className="btn-primary" onClick={editSetup}>{l('Main Lagi', 'Play Again')}</button>
    </section>}
    {session && session.phase !== 'over' && session.phase !== 'deal' && <button className="mt-5 min-h-12 text-sm text-slate-400" onClick={() => {
      if (window.confirm(l('Akhiri sesi Undercover dan kembali ke pengaturan?', 'End this Undercover session and return to setup?'))) editSetup()
    }}>{l('Akhiri Sesi', 'End Session')}</button>}
  </main>
}
