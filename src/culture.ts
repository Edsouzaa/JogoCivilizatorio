// Cultura, língua e religião: três coisas separadas, cada cidade com a sua mistura (fração da população).
// Cada tribo nasce com cultura própria, a língua da região dela e a religião da sua faixa do mundo.
// Com o tempo a população se assimila à cultura principal do dono, aprende a língua dele e se converte à
// religião dele, devagar e mais rápido com controle e letrados. Cultura não aceita = gente menos leal.
import type { World } from "./world.ts";
import type { Economy } from "./economy.ts";
import { LANGUAGES, makeName } from "./names.ts";
import { tv, tvMul, tvCut } from "./techvars.ts";

export type Mix = Record<number, number>; // id → fração (soma 1)
export type Identity = { culture: Mix; language: Mix; religion: Mix };

export const RELIGIONS = ["Culto dos ancestrais", "Fé do céu", "Mistérios da terra", "Caminho do fogo", "Culto do mar"];

export const CULTURE = {
  assimilateYear: 0.01, // fração da cultura que vira a do dono por ano (× controle)
  languageYear: 0.02,   // língua aprendida por ano
  convertYear: 0.008,   // conversão por ano
  literacyBoost: 2,     // × (1 + isto × letrados)
  unacceptedLoyalty: 25, // pontos de lealdade perdidos com 100% da população de cultura não aceita
};

/** Religião inicial pela faixa de longitude (mundos diferentes, histórias diferentes). */
const religionAt = (col: number, W: number, seed: number) => Math.abs(Math.floor((col / W) * RELIGIONS.length) + seed) % RELIGIONS.length;

/** Nome da cultura do país k (id = k): na língua dele. */
export const cultureName = (w: World, k: number) => {
  const c = w.countries[k - 1];
  return c ? makeName(c.lang ?? 0, w.seed * 101 + k * 3) + (["ns", "s", "nos", "is", "eses"][k % 5]) : "?";
};
export const languageName = (id: number) => LANGUAGES[id]?.name ?? "?";

/** Identidade de uma cidade nova do país: a da capital, sem minorias. */
export function homeIdentity(w: World, e: Economy, country: number): Identity {
  const c = w.countries[country - 1], ctry = e.countries[country - 1];
  ctry.primaryCulture ??= country;
  ctry.officialLanguage ??= c.lang ?? 0;
  ctry.stateReligion ??= religionAt(c.capital % w.W, w.W, w.seed);
  return { culture: { [ctry.primaryCulture]: 1 }, language: { [ctry.officialLanguage]: 1 }, religion: { [ctry.stateReligion]: 1 } };
}

/** Puxa a fração `rate` da mistura para o alvo (sem criar nem perder gente). */
export function shift(mix: Mix, target: number, rate: number) {
  let moved = 0;
  for (const k of Object.keys(mix)) {
    const id = +k;
    if (id === target) continue;
    const m = mix[id] * rate;
    mix[id] -= m; moved += m;
    if (mix[id] < 1e-4) { moved += mix[id]; delete mix[id]; }
  }
  mix[target] = (mix[target] ?? 0) + moved;
}

/** Fração da população da cidade que é de cultura aceita pelo dono. */
export const acceptedShare = (e: Economy, k: number) => {
  const city = e.cities[k], c = e.countries[city.country - 1], id = city.identity;
  if (!id) return 1;
  const ok = new Set([c.primaryCulture, ...(c.acceptedCultures ?? [])]);
  return Object.entries(id.culture).reduce((s, [cid, f]) => s + (ok.has(+cid) ? f : 0), 0);
};

/** Uma vez por ano: assimilação, língua e conversão; devolve, por país, a perda de lealdade por cultura não aceita. */
export function stepCulture(w: World, e: Economy) {
  const penalty = new Float64Array(e.countries.length), pop = new Float64Array(e.countries.length);
  e.cities.forEach((city, k) => {
    city.identity ??= homeIdentity(w, e, city.country);
    const c = e.countries[city.country - 1];
    homeIdentity(w, e, city.country); // garante os campos do país
    const ctrl = city.urban.length ? city.urban.reduce((s, j) => s + e.control[j], 0) / city.urban.length : 1;
    const boost = 1 + CULTURE.literacyBoost * (c.literacy ?? 0);
    shift(city.identity.culture, c.primaryCulture!, CULTURE.assimilateYear * ctrl * boost * tvMul(c.research, "culturalIntegration"));
    shift(city.identity.language, c.officialLanguage!, CULTURE.languageYear * ctrl * boost * tvMul(c.research, "assimilation"));
    shift(city.identity.religion, c.stateReligion!, CULTURE.convertYear * ctrl * boost);
    const p = city.market.pop;
    pop[city.country - 1] += p;
    penalty[city.country - 1] += p * (1 - acceptedShare(e, k)) * CULTURE.unacceptedLoyalty;
  });
  return Array.from(penalty, (v, i) => (pop[i] ? v / pop[i] : 0));
}

/** Mistura do país (soma das cidades pela população). */
export function countryMix(e: Economy, country: number, field: keyof Identity): [number, number][] {
  const out: Mix = {};
  let total = 0;
  for (const c of e.cities) {
    if (c.country !== country || !c.identity) continue;
    for (const [id, f] of Object.entries(c.identity[field])) out[+id] = (out[+id] ?? 0) + f * c.market.pop;
    total += c.market.pop;
  }
  return Object.entries(out).map(([id, v]) => [+id, total ? v / total : 0] as [number, number]).sort((a, b) => b[1] - a[1]);
}
