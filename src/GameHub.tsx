import { useEffect, useState } from 'react'
import { Moon, ScanFace, Timer } from 'lucide-react'
import App from './App'
import Undercover from './Undercover'
import PartyBomb from './PartyBomb'
import { languageKey } from './language'

export default function GameHub() {
  const [route, setRoute] = useState(window.location.hash)
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  if (route === '#werewolf') return <App />
  if (route === '#undercover') return <Undercover />
  if (route === '#party-bomb') return <PartyBomb />
  const en = localStorage.getItem(languageKey) === 'en'
  return <main className="app flex flex-col justify-center">
    <h1 className="text-4xl font-black tracking-tight sm:text-5xl">One Phone,<br />One Table</h1>
    <p className="mt-3 text-slate-300">{en ? 'Pick a game and pass the phone around.' : 'Pilih game, lalu oper HP bergantian.'}</p>
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      <a href="#werewolf" className="btn-primary"><Moon size={20} />{en ? 'Play Werewolf' : 'Main Werewolf'}</a>
      <a href="#undercover" className="btn-secondary !border-cyan-700 !bg-cyan-950"><ScanFace size={20} />{en ? 'Play Undercover' : 'Main Undercover'}</a>
      <a href="#party-bomb" className="btn-secondary !border-amber-600 !bg-amber-950 !text-amber-200 sm:col-span-2"><Timer size={20} />Party Bomb Defused</a>
    </div>
  </main>
}
