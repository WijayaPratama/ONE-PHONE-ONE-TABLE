import { useEffect, useRef, useState } from 'react'
import { createMission, modes, solved, tempos, wireColors, wireLabel, type Difficulty, type Mission, type Tempo } from './partyBombLogic'

type Phase = 'setup' | 'clues' | 'console' | 'result'
type Result = 'success' | 'wire' | 'pin' | 'timeout'

export default function PartyBomb() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [names, setNames] = useState(['', '', '', ''])
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [tempo, setTempo] = useState<Tempo>('Normal')
  const help = useRef<HTMLDialogElement>(null)
  const [mission, setMission] = useState<Mission>()
  const [agent, setAgent] = useState(0)
  const [showClue, setShowClue] = useState(false)
  const [readClue, setReadClue] = useState(false)
  const held = useRef(false)
  const audio = useRef<AudioContext | undefined>(undefined)
  const [deadline, setDeadline] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [cuts, setCuts] = useState(0)
  const [chosen, setChosen] = useState<number>()
  const [pin, setPin] = useState('')
  const [pinDone, setPinDone] = useState(false)
  const [result, setResult] = useState<Result>()
  const ended = useRef(false)
  const name = (i: number) => names[i].trim() || `Agen ${i + 1}`

  function beep(hz: number, duration = 0.1, type: OscillatorType = 'sine') {
    try {
      const ctx = audio.current ??= new AudioContext()
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = type
      oscillator.frequency.value = hz
      gain.gain.setValueAtTime(0.065, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + duration)
    } catch { /* Audio may be unavailable. */ }
  }

  function finish(value: Result) {
    if (ended.current) return
    ended.current = true
    setRemaining(Math.max(0, deadline - Date.now()))
    setResult(value)
    setPhase('result')
    if (value === 'success') { beep(880, 0.45); beep(1320, 0.3) }
    else { beep(65, 0.5, 'sawtooth'); navigator.vibrate?.([120, 60, 180]) }
  }

  useEffect(() => {
    if (phase !== 'console') return
    let lastTick = -1
    const tick = () => {
      const ms = Math.max(0, deadline - Date.now())
      setRemaining(ms)
      if (!ms) { finish('timeout'); return }
      const step = Math.ceil(ms / (ms <= 10000 ? 250 : 1000))
      if (step !== lastTick) { lastTick = step; beep(ms <= 10000 ? 740 : 440, 0.045) }
    }
    const id = window.setInterval(tick, 50)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [phase, deadline])

  useEffect(() => {
    const release = () => {
      if (!held.current) return
      held.current = false
      setShowClue(false)
      setReadClue(true)
    }
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', release)
    return () => { window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', release) }
  }, [])
  useEffect(() => () => { if (audio.current) void audio.current.close().catch(() => {}) }, [])

  function start() {
    setMission(createMission(difficulty, names.length))
    setAgent(0)
    setReadClue(false)
    setShowClue(false)
    setCuts(0)
    setChosen(undefined)
    setPin('')
    setPinDone(false)
    setResult(undefined)
    ended.current = false
    setPhase('clues')
  }

  function hold() {
    if (held.current) return
    held.current = true
    setShowClue(true)
  }
  function release() {
    if (!held.current) return
    held.current = false
    setShowClue(false)
    setReadClue(true)
  }

  function advance() {
    if (!readClue || held.current) return
    if (agent + 1 < names.length) {
      setAgent(agent + 1)
      setReadClue(false)
      return
    }
    const duration = tempos[tempo] * 1000
    setDeadline(Date.now() + duration)
    setRemaining(duration)
    beep(540)
    setPhase('console')
  }

  function cut() {
    if (!mission || chosen === undefined || ended.current || cuts >= mission.targets.length) return
    if (Date.now() >= deadline) { finish('timeout'); return }
    if (chosen !== mission.targets[cuts]) { finish('wire'); return }
    beep(240, 0.13, 'triangle')
    setChosen(undefined)
    setCuts(cuts + 1)
    if (solved(mission, cuts + 1, pinDone)) finish('success')
  }

  function submitPin() {
    if (!mission?.pin || pinDone || ended.current || pin.length !== mission.pin.length) return
    if (Date.now() >= deadline) { finish('timeout'); return }
    if (pin !== mission.pin) { finish('pin'); return }
    setPinDone(true)
    if (solved(mission, cuts, true)) finish('success')
    else beep(720)
  }

  const format = (ms: number) => (ms / 1000).toFixed(1)
  return <main className="app !max-w-3xl !bg-none bg-[#0a101b]">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
      <p className="font-mono text-sm font-bold text-amber-300">◆ PARTY BOMB DEFUSED</p>
      <div className="flex flex-wrap gap-2">
        {phase === 'setup' && <a href="#games" className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Menu game</a>}
        {phase !== 'console' && <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-amber-300" onClick={() => help.current?.showModal()}>Cara Main</button>}
      </div>
    </header>
    <dialog ref={help} aria-labelledby="bomb-help" className="w-[calc(100%-2rem)] max-w-lg rounded-xl border border-slate-600 bg-slate-900 p-5 text-slate-100 backdrop:bg-black/75">
      <h2 id="bomb-help" className="text-xl font-bold text-amber-300">Cara Main</h2>
      <ol className="my-4 list-decimal space-y-3 pl-5">
        <li><b>Baca clue bergantian.</b> Oper HP. Setiap agen menahan tombol untuk membaca clue sendiri dan bisa membacanya ulang sampai menekan Lanjut.</li>
        <li><b>Gabungkan clue.</b> Timer langsung berjalan saat menekan Mulai Penjinakan. Sebutkan petunjuk masing-masing dan sepakati pilihan tim.</li>
        <li><b>Bedakan urutan potong dan label kabel.</b> “Kabel ke-1” adalah kabel yang dipotong dulu. Label A, B, C, dan seterusnya mengikuti urutan dari atas. Jika kabel ke-1 adalah C, pilih C lalu tekan tombol potong.</li>
        <li><b>Selesaikan modul.</b> Easy meminta satu potongan; Medium dua potongan berurutan. Hard meminta satu potongan dan PIN; Impossible dua potongan berurutan dan PIN. Jika ada PIN, modul mana pun boleh dikerjakan dulu.</li>
        <li><b>Periksa sebelum konfirmasi.</b> Kabel salah, urutan terbalik, PIN salah saat menekan OK, atau timer habis akan mengakhiri misi.</li>
      </ol>
      <form method="dialog"><button className="btn-primary !bg-amber-400 !text-slate-950">Mengerti</button></form>
    </dialog>
    {phase === 'setup' && <section className="space-y-4">
      <div className="py-4 text-center">
        <p className="font-mono text-sm tracking-wider text-amber-300">SIMULASI KERJA SAMA · 3–6 AGEN</p>
        <h1 className="mt-2 text-4xl font-black">Kabel <span className="text-red-400">merah</span><br />atau <span className="text-sky-400">biru?</span></h1>
        <p className="mt-2 text-slate-300">Oper HP, hafalkan petunjuk, dan selesaikan misi sebelum waktu habis.</p>
      </div>
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button className="btn-secondary max-w-12 !px-0" aria-label="Kurangi agen" disabled={names.length === 3} onClick={() => setNames(names.slice(0, -1))}>−</button>
          <p className="text-center"><strong className="text-xl">{names.length}</strong><br />Jumlah agen</p>
          <button className="btn-secondary max-w-12 !px-0" aria-label="Tambah agen" disabled={names.length === 6} onClick={() => setNames([...names, ''])}>+</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">{names.map((value, i) => <input key={i} aria-label={`Nama agen ${i + 1}`} placeholder={`Agen ${i + 1}`} value={value} maxLength={28} onChange={e => setNames(names.map((old, j) => i === j ? e.target.value : old))} className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-950 px-3" />)}</div>
      </div>
      <fieldset className="card"><legend className="px-2 font-bold">Kesulitan</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(modes) as Difficulty[]).map(mode => <button key={mode} aria-pressed={difficulty === mode} className={`btn-secondary !px-2 ${difficulty === mode ? '!border-amber-400 !text-amber-300' : ''}`} onClick={() => setDifficulty(mode)}>{mode}</button>)}
      </div><p className="mt-3 text-sm text-slate-300">{modes[difficulty].wires} kabel · potong {modes[difficulty].cuts}{modes[difficulty].digits ? ` · PIN ${modes[difficulty].digits} digit` : ''}</p></fieldset>
      <fieldset className="card"><legend className="px-2 font-bold">Tempo timer</legend><div className="grid grid-cols-3 gap-2">
        {(Object.keys(tempos) as Tempo[]).map(value => <button key={value} aria-pressed={tempo === value} className={`btn-secondary !flex-col !gap-0 !px-1 py-2 text-sm ${tempo === value ? '!border-amber-400 !text-amber-300' : ''}`} onClick={() => setTempo(value)}>{value}<span className="font-mono text-xs">{tempos[value]} detik</span></button>)}
      </div></fieldset>
      <button className="btn-primary !bg-amber-400 !text-slate-950" onClick={start}>Mulai Misi</button>
    </section>}
    {phase === 'clues' && mission && <section className="space-y-4">
      <p className="font-mono text-sm text-amber-300">DISTRIBUSI INTELIJEN · {agent + 1}/{names.length}</p>
      <p className="text-sm text-slate-300">{mission.targets.length === 1
        ? 'Kabel ke-1 adalah satu-satunya kabel yang harus dipotong.'
        : 'Kabel ke-1 harus dipotong pertama. Setelah itu, potong Kabel ke-2.'}</p>
      <progress className="w-full accent-amber-400" value={agent + 1} max={names.length} />
      <div className="card text-center"><p className="text-slate-300">Serahkan HP kepada</p><h1 className="text-2xl font-black text-amber-300">{name(agent)}</h1></div>
      <div className="min-h-40 rounded-xl border border-dashed border-slate-600 bg-slate-900 p-4">
        {showClue ? <ul className="space-y-2">{mission.hands[agent].map(clue => <li key={clue}>• {clue}</li>)}</ul> : <p className="py-10 text-center text-slate-300">{readClue ? 'Tahan lagi untuk membaca ulang, atau lanjutkan jika sudah siap.' : 'Dokumen intelijen terkunci.'}</p>}
      </div>
      <button className="btn-secondary touch-none select-none !border-amber-500 !text-amber-300"
        onContextMenu={event => event.preventDefault()} onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); hold() }}
        onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
        onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); hold() } }}
        onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') release() }} onBlur={release}>Tahan untuk Melihat Clue</button>
      <button className="btn-primary !bg-amber-400 !text-slate-950" disabled={!readClue || showClue} onClick={advance}>{agent + 1 === names.length ? 'Mulai Penjinakan' : 'Lanjut ke Agen Berikutnya'}</button>
    </section>}
    {phase === 'console' && mission && <section className="space-y-3">
      <div className="card grid grid-cols-[auto_1fr_auto] items-center gap-2 !border-t-amber-400 font-mono">
        <p className="text-sm text-amber-300">SERI<br /><b>{mission.serial}</b></p>
        <div className="text-center text-sm">
          <p className={cuts === mission.targets.length ? 'text-emerald-300' : ''}>Kabel {cuts}/{mission.targets.length}</p>
          {mission.pin && <p className={pinDone ? 'text-emerald-300' : 'text-sky-300'}>PIN {pinDone ? 'beres' : 'aktif'}</p>}
        </div>
        <p className={`text-2xl font-black tabular-nums sm:text-4xl ${remaining <= 10000 ? 'text-red-400' : 'text-amber-300'}`}>{format(remaining)}</p>
      </div>
      <div className={`grid gap-3 ${mission.pin ? 'min-[400px]:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]' : ''}`}>
        <section className="card !p-3">
          <h2 className="mb-2 font-mono text-sm font-bold text-amber-300">MODUL KABEL</h2>
          <div className="space-y-2">{mission.wires.map((color, i) => <button key={i} aria-pressed={chosen === i} disabled={mission.targets.slice(0, cuts).includes(i) || cuts === mission.targets.length} onClick={() => setChosen(i)} className={`flex min-h-11 w-full items-center gap-2 rounded-lg border px-2 text-sm disabled:opacity-40 ${chosen === i ? 'border-amber-300 bg-amber-950' : 'border-slate-700 bg-slate-950'}`}><b>{wireLabel(i)}</b><span className="flex-1 rounded px-1 text-center font-mono font-black text-slate-950" style={{ background: wireColors[color] }}>{color.toUpperCase()}</span></button>)}</div>
          <button className="btn-primary mt-3 !bg-amber-400 !px-2 !text-slate-950" disabled={chosen === undefined || cuts === mission.targets.length} onClick={cut}>{cuts === mission.targets.length ? 'Kabel selesai' : chosen === undefined ? 'Pilih kabel' : `Potongan ${cuts + 1}: Potong Kabel ${wireLabel(chosen)}`}</button>
        </section>
        {mission.pin && <section className="card !p-3">
          <h2 className="mb-2 font-mono text-sm font-bold text-sky-300">MODUL PIN</h2>
          <div className="mb-3 flex justify-center gap-2 rounded-lg bg-slate-950 p-2 font-mono text-lg">{Array.from({ length: mission.pin.length }, (_, i) => <span key={i} className="w-7 text-center">{pin[i] ?? '–'}</span>)}</div>
          <div className="grid grid-cols-3 gap-1">{['1','2','3','4','5','6','7','8','9','CLR','0','OK'].map(key => <button key={key} className="btn-secondary !px-0 font-mono" disabled={pinDone || (key === 'OK' && pin.length !== mission.pin.length)} onClick={() => {
            if (key === 'OK') submitPin()
            else { beep(620, 0.055); setPin(key === 'CLR' ? '' : (pin + key).slice(0, mission.pin.length)) }
          }}>{key}</button>)}</div>
        </section>}
      </div>
    </section>}
    {phase === 'result' && mission && <section className="space-y-4">
      <div className={`card text-center ${result === 'success' ? '!border-emerald-500 !bg-emerald-950' : '!border-red-500 !bg-red-950'}`}>
        <h1 className="text-3xl font-black">{result === 'success' ? 'Bom Dijinakkan!' : 'Misi Gagal'}</h1>
        <p className="mt-2">{result === 'success' ? `Sisa waktu ${format(remaining)} detik.` : result === 'wire' ? 'Kabel yang dipotong salah atau urutannya terbalik.' : result === 'pin' ? 'Kode PIN salah.' : 'Waktu habis.'}</p>
      </div>
      <div className="card"><h2 className="font-bold text-amber-300">Kunci misi · Seri {mission.serial}</h2>
        <ol className="mt-2 space-y-1">{mission.targets.map((i, order) => <li key={i}>Kabel ke-{order + 1}: {wireLabel(i)} · {mission.wires[i]}</li>)}</ol>
        {mission.pin && <p className="mt-2">PIN: <b className="font-mono text-sky-300">{mission.pin}</b></p>}
      </div>
      <div className="card"><h2 className="font-bold">Rangkuman clue</h2><div className="mt-2 max-h-64 space-y-3 overflow-auto">
        {mission.hands.map((hand, i) => <div key={i}><b className="text-amber-300">{name(i)}</b>{hand.map(clue => <p key={clue} className="text-sm">• {clue}</p>)}</div>)}
      </div></div>
      <button className="btn-primary !bg-emerald-400 !text-slate-950" onClick={start}>Main Lagi dengan Agen Sama</button>
      <button className="btn-secondary" onClick={() => setPhase('setup')}>Ganti Agen / Pengaturan</button>
    </section>}
  </main>
}
