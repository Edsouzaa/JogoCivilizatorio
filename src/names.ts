// Nomes gerados por "língua": cada língua tem sílabas e finais próprios, então os nomes de uma mesma
// região soam parecidos. Serve para tribos, cidades, continentes (e, depois, personagens e culturas).

export type Language = { name: string; start: string[]; mid: string[]; end: string[] };

export const LANGUAGES: Language[] = [
  { name: "Latina", start: ["Ro", "Ca", "Va", "Lu", "Ma", "Tar", "Ve", "Au", "Fa", "Cor"], mid: ["ma", "li", "ve", "ra", "ti", "ne", "ri"], end: ["a", "um", "ia", "us", "o", "ona", "ana"] },
  { name: "Germânica", start: ["Har", "Wul", "Brun", "Sig", "Ald", "Gund", "Thor", "Eck", "Hal", "Ost"], mid: ["de", "ri", "bert", "wal", "mun", "ga"], end: ["burg", "heim", "mar", "wald", "stadt", "fold", "berg"] },
  { name: "Eslava", start: ["Vla", "Bor", "Mir", "Sve", "Kra", "Zla", "Dob", "Rad", "Pol", "Vol"], mid: ["di", "slo", "go", "ro", "ze", "mi"], end: ["grad", "ov", "ava", "sk", "ice", "evo", "nik"] },
  { name: "Árabe", start: ["Al", "Qa", "Ha", "Sa", "Ma", "Ra", "Ja", "Za", "Ba", "Ka"], mid: ["ri", "si", "di", "ba", "hi", "mi"], end: ["ra", "bad", "dir", "ya", "ah", "un", "ir"] },
  { name: "Sínica", start: ["Shan", "Lin", "Hua", "Jin", "Bai", "Yun", "Chang", "Xi", "Dong", "Nan"], mid: ["", "", "jiang", "ning", "an"], end: ["zhou", "an", "ling", "yang", "shan", "hai", "du"] },
  { name: "Banto", start: ["Ka", "Mbo", "Zu", "Nga", "Tu", "Lu", "Ki", "Mwa", "Ba", "Ndo"], mid: ["la", "si", "mbe", "go", "nyi", "wa"], end: ["ni", "nga", "bo", "we", "ma", "zi", "nda"] },
  { name: "Náuatle", start: ["Teo", "Xo", "Tla", "Co", "Mix", "Tex", "Cua", "Ichi", "Ocu", "Ato"], mid: ["ti", "chi", "ca", "pe", "mo", "co"], end: ["tlan", "co", "pan", "titlan", "huac", "tepec", "apan"] },
  { name: "Tupi", start: ["Ita", "Pira", "Jaca", "Ara", "Ibi", "Guara", "Taba", "Cara", "Para", "Iga"], mid: ["pu", "ra", "ti", "cu", "ju", "be"], end: ["ba", "tinga", "çu", "una", "ema", "pora", "ré"] },
  { name: "Nórdica", start: ["Skal", "Fjor", "Ulf", "Ing", "Kjar", "Sval", "Bjor", "Hval", "Rag", "Ask"], mid: ["", "a", "e", "vi"], end: ["vik", "heim", "dal", "by", "sund", "nes", "holm"] },
  { name: "Persa", start: ["Isfa", "Ker", "Shi", "Tab", "Ner", "Par", "Daru", "Zar", "Kho", "Ara"], mid: ["ra", "ma", "sa", "ha", ""], end: ["abad", "an", "istan", "shahr", "gerd", "dar", "kand"] },
];

/** Gerador pseudoaleatório pequeno (determinístico pela semente). */
const rng = (seed: number) => () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) | 0; return ((seed >>> 0) % 100000) / 100000; };

/** Nome na língua \`lang\`, sempre o mesmo para a mesma semente. */
export function makeName(lang: number, seed: number) {
  const L = LANGUAGES[((lang % LANGUAGES.length) + LANGUAGES.length) % LANGUAGES.length], r = rng(seed * 7919 + lang * 104729 + 1);
  const pick = (a: string[]) => a[Math.floor(r() * a.length)];
  const name = pick(L.start) + (r() < 0.5 ? pick(L.mid) : "") + pick(L.end);
  return name[0].toUpperCase() + name.slice(1).toLowerCase();
}

/** Língua de uma posição do mapa: faixas grandes de longitude/latitude, para regiões vizinhas soarem parecido. */
export const languageAt = (col: number, row: number, W: number, H: number, seed: number) =>
  Math.abs(Math.floor((col / W) * 5 + seed) * 3 + Math.floor((row / H) * 3)) % LANGUAGES.length;
