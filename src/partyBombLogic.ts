export const modes = {
  Easy: { wires: 5, cuts: 1, digits: 0 },
  Medium: { wires: 5, cuts: 2, digits: 0 },
  Hard: { wires: 6, cuts: 1, digits: 3 },
  Impossible: { wires: 6, cuts: 2, digits: 3 },
} as const
export type Difficulty = keyof typeof modes
export const tempos = { Santai: 75, Normal: 45, Panik: 30 } as const
export type Tempo = keyof typeof tempos
const colors = ['Merah', 'Biru', 'Kuning', 'Hijau', 'Ungu', 'Putih'] as const
export const wireColors = { Merah: '#f87171', Biru: '#60a5fa', Kuning: '#facc15', Hijau: '#34d399', Ungu: '#c084fc', Putih: '#e2e8f0' }
export type WireColor = typeof colors[number]
export const wireLabel = (index: number) => String.fromCharCode(65 + index)

export interface Clue {
  text: string
  family: string
  accepts: (sequence: number[]) => boolean
}

export function possibleCuts(wireCount: number, cuts: number): number[][] {
  const positions = Array.from({ length: wireCount }, (_, i) => i)
  return positions.flatMap(first => cuts === 1 ? [[first]] : positions.filter(second => second !== first).map(second => [first, second]))
}

export function createMission(difficulty: Difficulty, agents: number, random = Math.random) {
  const config = modes[difficulty]
  const index = (length: number) => Math.floor(random() * length)
  const positions = Array.from({ length: config.wires }, (_, i) => i)
  const wires = positions.map(() => colors[index(colors.length)])
  const serial = String(100 + index(900))
  const sequences = possibleCuts(config.wires, config.cuts)
  const targets = sequences[index(sequences.length)]
  const total = config.digits ? (agents <= 4 ? 9 : agents * 2) : agents <= 4 ? agents * 2 : 7
  const offset = index(agents)
  const capacity = positionsForAgents().map((_, i) => Math.floor(total / agents) + (i < total % agents ? 1 : 0))
  const hands: string[][] = positionsForAgents().map(() => [])
  const cards: Clue[][] = positionsForAgents().map(() => [])
  const clues: Clue[] = []
  const used = new Set<string>()
  function positionsForAgents() { return Array.from({ length: agents }, (_, i) => (i + offset) % agents) }

  const serialDigits = [...serial].map(Number)
  const reference = index(positions.length)
  const order = index(targets.length)
  const uniqueColors = colors.filter(color => wires.filter(wire => wire === color).length === 1)
  const uniqueColor = uniqueColors[index(uniqueColors.length)]
  const formulas = [
    { family: 'target', value: targets[order] + 1, rule: `nomor posisi Kabel ke-${order + 1}` },
    index(2) === 0
      ? { family: 'arithmetic', value: (serialDigits[0] + serialDigits[2]) % 10, rule: 'satuan dari jumlah angka pertama dan terakhir nomor seri' }
      : { family: 'arithmetic', value: Math.abs(reference - targets[order]), rule: `selisih posisi kabel ${wireLabel(reference)} dan Kabel ke-${order + 1}` },
    index(2) === 0
      ? { family: 'condition', value: positions.filter(i => i % 2 === 1).length, rule: 'jumlah kabel di posisi genap' }
      : { family: 'condition', value: positions.filter(i => i < reference).length, rule: `jumlah kabel di atas kabel ${wireLabel(reference)}` },
    index(2) === 0
      ? { family: 'serial', value: Math.max(...serialDigits), rule: 'angka terbesar pada nomor seri' }
      : { family: 'serial', value: (serialDigits[0] + 8) % 10, rule: 'satuan dari angka pertama nomor seri ditambah 8' },
  ]
  if (uniqueColor) formulas.push({ family: 'letter', value: wires.indexOf(uniqueColor) + 1, rule: `posisi kabel ${uniqueColor}` })
  const pinFacts = Array.from({ length: config.digits }, (_, i) => {
    const [formula] = formulas.splice(index(formulas.length), 1)
    return { family: formula.family, digit: String(formula.value), text: `Digit ke-${i + 1} PIN adalah ${formula.rule}.` }
  })
  pinFacts.forEach((fact, agent) => hands[agent].push(fact.text))

  const signatures = new Map<Clue, string>()
  const signature = (clue: Clue) => {
    const cached = signatures.get(clue)
    if (cached !== undefined) return cached
    const value = sequences.map(sequence => clue.accepts(sequence) ? '1' : '0').join('')
    signatures.set(clue, value)
    return value
  }
  const canAdd = (agent: number, clue: Clue) => {
    const mask = signature(clue)
    if (hands[agent].length >= capacity[agent] || used.has(mask) || !mask.includes('0')) return false
    const left = sequences.filter(sequence => clue.accepts(sequence) && cards[agent].every(fact => fact.accepts(sequence)))
    return targets.every((_, order) => new Set(left.map(sequence => sequence[order])).size > 1)
  }
  const add = (agent: number, clue: Clue) => {
    clues.push(clue)
    used.add(signature(clue))
    cards[agent].push(clue)
    hands[agent].push(clue.text)
  }

  const extras: Clue[] = []
  targets.forEach((target, order) => {
    const label = `Kabel ke-${order + 1}`
    const fact = (text: string, allowed: number[], family = 'label'): Clue => ({ text: `${label} ${text}`, family, accepts: sequence => allowed.includes(sequence[order]) })
    const exclusion = (excluded: number[]) => fact(`bukan kabel ${excluded.map(wireLabel).join(' maupun ')}.`, positions.filter(i => !excluded.includes(i)))
    const patterns = [
      { family: 'position', text: `berada di posisi ${target % 2 ? 'genap' : 'ganjil'}.`, allowed: positions.filter(i => i % 2 === target % 2) },
      { family: 'position', text: `berada di tiga posisi ${target < 3 ? 'teratas' : 'terbawah'}.`, allowed: positions.filter(i => target < 3 ? i < 3 : i >= wires.length - 3) },
      { family: 'color', text: `berwarna ${wires[target]}.`, allowed: positions.filter(i => wires[i] === wires[target]) },
      ...colors.filter(color => color !== wires[target]).map(color => ({
        family: 'color', text: `bukan warna ${color}.`, allowed: positions.filter(i => wires[i] !== color),
      })),
      ...colors.flatMap(color => {
        const adjacent = positions.filter(i => wires[i - 1] === color || wires[i + 1] === color)
        const below = positions.filter(i => wires[i - 1] === color)
        return [
          { family: 'neighbor', text: `bersebelahan dengan kabel ${color}.`, allowed: adjacent },
          { family: 'neighbor', text: `tidak bersebelahan dengan kabel ${color}.`, allowed: positions.filter(i => !adjacent.includes(i)) },
          { family: 'neighbor', text: `berada tepat di bawah kabel ${color}.`, allowed: below },
        ]
      }),
    ].filter(pattern => pattern.allowed.includes(target) && pattern.allowed.length > 1 && pattern.allowed.length < wires.length)
    const pattern = patterns[index(patterns.length)]
    const core = [fact(pattern.text, pattern.allowed, pattern.family), exclusion(pattern.allowed.filter(i => i !== target))]
    const coreAgents = new Set<number>()
    for (const clue of core) {
      const agent = positionsForAgents().sort((a, b) => hands[a].length - hands[b].length)
        .find(i => !coreAgents.has(i) && canAdd(i, clue))
      if (agent === undefined) throw new Error('Cable clue could not be assigned')
      add(agent, clue)
      coreAgents.add(agent)
    }
    extras.push(...patterns.map(candidate => fact(candidate.text, candidate.allowed, candidate.family)))
    for (const color of colors) {
      const count = wires.filter(wire => wire === color).length
      if (count <= 1 || wires[target] === color) continue
      extras.push({
        family: 'condition',
        text: `Jika kabel ${color} lebih dari satu, ${label} bukan ${color}.`,
        accepts: sequence => wires[sequence[order]] !== color,
      })
    }
    const alternatives = positions.filter(i => i !== target)
    for (let mask = 1; mask < (1 << alternatives.length) - 1; mask++) {
      extras.push(exclusion(alternatives.filter((_, i) => mask & (1 << i))))
    }
  })
  if (targets.length === 2) {
    const lower = targets[1] > targets[0]
    extras.unshift({
      family: 'relation',
      text: `Kabel ke-2 berada lebih ${lower ? 'bawah' : 'atas'} dari kabel ke-1.`,
      accepts: sequence => (sequence[1] > sequence[0]) === lower,
    })
    const sameColor = wires[targets[0]] === wires[targets[1]]
    extras.unshift({
      family: 'relation',
      text: `Warna Kabel ke-2 ${sameColor ? 'sama dengan' : 'berbeda dari'} Kabel ke-1.`,
      accepts: sequence => (wires[sequence[0]] === wires[sequence[1]]) === sameColor,
    })
  }

  for (const agent of positionsForAgents()) {
    while (hands[agent].length < capacity[agent]) {
      const eligible = extras.filter(clue => canAdd(agent, clue))
      const fresh = eligible.filter(clue => !clues.some(used => used.family === clue.family))
      const varied = eligible.filter(clue => !cards[agent].some(used => used.family === clue.family))
      const pool = fresh.length ? fresh : varied.length ? varied : eligible
      if (!pool.length) throw new Error('No distinct cable clue remains for this agent')
      add(agent, pool[index(pool.length)])
    }
  }
  return { wires, serial, targets, pin: pinFacts.map(fact => fact.digit).join(''), pinFacts, clues, hands }
}

export type Mission = ReturnType<typeof createMission>
export const solved = (mission: Mission, cuts: number, pinDone: boolean) => cuts === mission.targets.length && (!mission.pin || pinDone)
