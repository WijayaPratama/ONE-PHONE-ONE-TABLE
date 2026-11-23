export type Pair = [string, string];
export type UndercoverRole = "Civilian" | "Undercover" | "Mr. White";
export interface UndercoverPlayer {
  name: string;
  role: UndercoverRole;
  alive: boolean;
}

export const defaultPairs: Pair[] = [
  ["Payung", "Jas Hujan"],
  ["Bantal", "Guling"],
  ["Sendok", "Garpu"],
  ["Sapu", "Pel"],
  ["Lampu", "Lilin"],
  ["Tas", "Ransel"],
  ["Jam Tangan", "Jam Dinding"],
  ["Handuk", "Selimut"],
  ["Kunci", "Gembok"],
  ["Dompet", "Tas"],
  ["Kafe", "Restoran"],
  ["Bandara", "Stasiun"],
  ["Pantai", "Danau"],
  ["Bioskop", "Teater"],
  ["Perpustakaan", "Toko Buku"],
  ["Pasar", "Supermarket"],
  ["Hotel", "Penginapan"],
  ["Gunung", "Bukit"],
  ["Kampus", "Sekolah"],
  ["Rumah Sakit", "Klinik"],
  ["Kopi", "Teh"],
  ["Bakso", "Mie Ayam"],
  ["Nasi Goreng", "Mie Goreng"],
  ["Sate", "Gulai"],
  ["Martabak Manis", "Martabak Telor"],
  ["Es Teh", "Es Jeruk"],
  ["Cokelat", "Karamel"],
  ["Roti", "Sereal"],
  ["Susu", "Santan"],
  ["Gorengan", "Kerupuk"],
  ["Laptop", "Tablet"],
  ["Smartphone", "Smartwatch"],
  ["Gelang", "Kalung"],
  ["Earphone", "Headphone"],
  ["Power Bank", "Charger"],
  ["Mouse", "Trackpad"],
  ["Keyboard", "Mouse"],
  ["Flashdisk", "Hardisk"],
  ["Micrphone", "Speaker"],
  ["Monitor", "Proyektor"],
  ["Dokter", "Perawat"],
  ["Guru", "Dosen"],
  ["Pilot", "Masinis"],
  ["Koki", "Barista"],
  ["Polisi", "Satpam"],
  ["Meja", "Kursi"],
  ["Pulpen", "Pensil"],
  ["Fotografer", "Videografer"],
  ["Jurnalis", "Content Creator"],
  ["Pengacara", "Hakim"],
];

export const normalizeWord = (word: string) =>
  word.trim().toLowerCase().replace(/\s+/g, " ");

export function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function canStart(names: string[], undercover: number, white: number) {
  const normalized = names.map(normalizeWord);
  const infiltrators = undercover + white;
  return (
    names.length >= 3 &&
    names.length <= 20 &&
    normalized.every(Boolean) &&
    new Set(normalized).size === names.length &&
    Number.isInteger(undercover) &&
    undercover >= 0 &&
    Number.isInteger(white) &&
    white >= 0 &&
    infiltrators >= 1 &&
    infiltrators * 2 < names.length
  );
}

export function winnerOf(players: UndercoverPlayer[]) {
  const alive = players.filter((player) => player.alive);
  const civilians = alive.filter((player) => player.role === "Civilian").length;
  const infiltrators = alive.length - civilians;
  if (infiltrators === 0) return "Civilian";
  if (civilians <= 1 && alive.some((player) => player.role === "Undercover"))
    return "Infiltrator";
  return undefined;
}

export function finalWhiteIndex(players: UndercoverPlayer[]) {
  const alive = players.filter((player) => player.alive);
  if (alive.some((player) => player.role === "Undercover")) return -1;
  const civilians = alive.filter((player) => player.role === "Civilian").length;
  if (civilians > 1 || (civilians === 1 && alive.length !== 2)) return -1;
  return players.findIndex(
    (player) => player.alive && player.role === "Mr. White",
  );
}
