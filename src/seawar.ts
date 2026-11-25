// Guerra naval: tempo no mar por zona, batalha naval com dados (como a terrestre), missões de frota e comboios além-mar.
// Ver docs/batalhas.md. Configuração em SEA.
import { T, mulberry32, type World } from "./world.ts";
import type { Division, Economy } from "./economy.ts";
import { techSum } from "./tech.ts";
import { craftOf, SHIPS } from "./units.ts";
import type { Battle } from "./battle.ts";

export type SeaWeather = "calmo" | "agitado" | "tempestade" | "nevoeiro" | "gelo";
export const NAVAL_MISSIONS = ["Superioridade naval", "Patrulha", "Escolta de comboios", "Bloqueio", "Bombardeio costeiro", "Defesa costeira"] as const;
export type NavalMission = (typeof NAVAL_MISSIONS)[number];
export const SEA = {
  rounds: 2, casualty: 0.03, orgDamage: 0.1, maxOrg: 0.3, maxLoss: 0.15, broken: 0.1,
  storm: { highLat: 0.15, tropic: 0.1, base: 0.04, mod: -1, loss: 0.5 }, // tempestade: chance por zona e semana; −1 para os dois; perdas pela metade
  fog: 0.05, rough: 0.2,
  sub: { share: 0.3, mod: 1 },       // emboscada submarina: lado com submarinos contra quem não tem
  carrier: { mod: 1 },               // aviação embarcada
  seek: 1,                           // missão de superioridade: busca o combate (+1)
  convoy: { base: 0.6, escort: 0.3, interdiction: 0.6, storm: 0.7, reach: 4 }, // suprimento além-mar
  bombard: 1,                        // bombardeio costeiro: +1 na batalha terrestre no litoral
};
const hash = (a: number, b: number, salt: number) => { let h = Math.imul(a ^ Math.imul(b, 2654435761), 2246822519) ^ salt; h = Math.imul(h ^ (h >>> 15), 3266489917); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
/** Tempo do mar no hex (pela zona marítima, latitude e estação). */
export function seaWeather(w: World, hex: number, week: number): SeaWeather {
  const lat = Math.abs(((hex / w.W) | 0) / w.H - 0.5) * 2, zone = w.seaZone[hex];
  const north = ((hex / w.W) | 0) < w.H / 2, winter = Math.cos((2 * Math.PI * (week % 52)) / 52) * (north ? 1 : -1); // 1 = auge do inverno
  if (lat > 0.85 && winter > 0) return "gelo";
  const storm = lat > 0.55 ? SEA.storm.highLat * (winter > 0 ? 1.5 : 0.5) : lat < 0.3 ? SEA.storm.tropic * (winter < 0 ? 1.5 : 0.3) : SEA.storm.base;
  const r = hash(zone, week, 51);
  if (r < storm) return "tempestade";
  if (r < storm + SEA.fog) return "nevoeiro";
  return r < storm + SEA.fog + SEA.rough ? "agitado" : "calmo";
}
export const missionOfFleet = (d: Division): NavalMission => (NAVAL_MISSIONS as readonly string[]).includes(d.mission ?? "") ? d.mission as NavalMission : "Superioridade naval";
const shareOf = (ds: Division[], name: string) => { const all = ds.reduce((s, d) => s + d.strength, 0); return all ? ds.filter((d) => craftOf(SHIPS, d.unit).name === name).reduce((s, d) => s + d.strength, 0) / all : 0; };
const power = (e: Economy, ds: Division[]) => ds.reduce((s, d) => s + d.strength * d.org * (1 + techSum(e.countries[d.country - 1].research, "fleet")) * craftOf(SHIPS, d.unit).power, 0);

/** Uma semana de combate naval em cada zona: dados, tempo, submarinos, porta-aviões, missão. Devolve as frotas que lutaram. */
export function resolveNaval(w: World, e: Economy, atWar: (a: number, b: number) => boolean, losses: (ds: Division[], n: number) => void, homePort: (country: number) => number) {
  const fighting = new Set<Division>();
  const byZone = new Map<number, Division[]>();
  for (const d of e.divisions) if (d.kind === "fleet" && d.strength >= 1) { const z = w.seaZone[d.hex]; if (!byZone.has(z)) byZone.set(z, []); byZone.get(z)!.push(d); }
  e.battles ??= [];
  for (const [zone, fs] of byZone) {
    const cs = [...new Set(fs.map((f) => f.country))];
    for (const a of cs) for (const bc of cs) {
      if (a >= bc || !atWar(a, bc)) continue;
      const A = fs.filter((f) => f.country === a), B = fs.filter((f) => f.country === bc);
      if (!A.length || !B.length) continue;
      const hex = A[0].hex;
      let b = e.battles.find((x) => x.naval && x.state === "combate" && w.seaZone[x.hex] === zone && ((x.attacker === a && x.defender === bc) || (x.attacker === bc && x.defender === a)));
      if (!b) { b = { id: (e.nextBattle = (e.nextBattle ?? 0) + 1), hex, attacker: a, defender: bc, start: e.week, last: e.week, dirs: 1, frontage: 0, state: "combate", startAtt: sum(A), startDef: sum(B), deadAtt: 0, deadDef: 0, log: [], naval: true }; e.battles.push(b); }
      b.last = e.week;
      const [X, Y] = b.attacker === a ? [A, B] : [B, A];
      const wx = seaWeather(w, hex, e.week), rand = mulberry32((w.seed * 6151 + e.week * 89 + zone * 31) >>> 0);
      for (let r = 0; r < SEA.rounds; r++) {
        const fx = X.filter((d) => d.org >= SEA.broken && d.strength >= 1), fy = Y.filter((d) => d.org >= SEA.broken && d.strength >= 1);
        if (!fx.length || !fy.length) break;
        const mods = (me: Division[], them: Division[]): [string, number][] => {
          const m: [string, number][] = [];
          const t = (x: Division[]) => Math.max(0, ...x.map((d) => techSum(e.countries[d.country - 1].research, "fleet")));
          const dt = Math.round((t(me) - t(them)) * 2); if (dt) m.push(["Tecnologia naval", Math.max(-3, Math.min(3, dt))]);
          if (r === 0 && shareOf(me, "Submarinos") >= SEA.sub.share && shareOf(them, "Submarinos") === 0) m.push(["Emboscada submarina", SEA.sub.mod]);
          if (shareOf(me, "Porta-aviões") > 0 && shareOf(them, "Porta-aviões") === 0) m.push(["Aviação embarcada", SEA.carrier.mod]);
          if (me.some((d) => missionOfFleet(d) === "Superioridade naval")) m.push(["Busca o combate", SEA.seek]);
          if (wx === "tempestade") m.push(["Tempestade", SEA.storm.mod]);
          if (wx === "nevoeiro") m.push(["Nevoeiro", -1]);
          return m;
        };
        const ma = mods(fx, fy), md = mods(fy, fx);
        const ra = 1 + Math.floor(rand() * 10), rd = 1 + Math.floor(rand() * 10);
        const ta = Math.max(1, ra + ma.reduce((s, [, v]) => s + v, 0)), td = Math.max(1, rd + md.reduce((s, [, v]) => s + v, 0));
        const storm = wx === "tempestade" ? SEA.storm.loss : 1, pa = power(e, fx), pd = power(e, fy);
        const kY = Math.min(sum(fy) * SEA.maxLoss, pa * SEA.casualty * storm * (2 * ta) / (ta + td)), kX = Math.min(sum(fx) * SEA.maxLoss, pd * SEA.casualty * storm * (2 * td) / (ta + td));
        losses(fy, kY); losses(fx, kX); b.deadAtt += kX; b.deadDef += kY;
        for (const d of fy) d.org = Math.max(0, d.org - Math.min(SEA.maxOrg, SEA.orgDamage * (pa / (pd || 1)) * (ta / td)));
        for (const d of fx) d.org = Math.max(0, d.org - Math.min(SEA.maxOrg, SEA.orgDamage * (pd / (pa || 1)) * (td / ta)));
        b.log.push({ week: e.week, round: r + 1, phase: "fogo", att: { roll: ra, mods: ma, total: ta }, def: { roll: rd, mods: md, total: td },
          text: `${wx !== "calmo" ? `Mar ${wx}. ` : ""}${ta > td ? "Vantagem do atacante" : td > ta ? "Vantagem do defensor" : "Equilíbrio"}: atacante perde ${Math.round(kX)} marinheiros, defensor ${Math.round(kY)}` });
        if (b.log.length > 40) b.log.shift();
      }
      for (const f of [...A, ...B]) {
        fighting.add(f);
        if (f.org >= SEA.broken) continue;
        const home = homePort(f.country); // derrotada: volta ao porto para reparo, ou afunda se não tiver para onde ir
        if (home < 0 || w.seaZone[home] === zone) f.strength = 0; else { f.hex = home; f.target = null; }
      }
      const xUp = X.some((d) => d.strength >= 1 && d.org >= SEA.broken && w.seaZone[d.hex] === zone), yUp = Y.some((d) => d.strength >= 1 && d.org >= SEA.broken && w.seaZone[d.hex] === zone);
      if (!yUp) b.state = "vitória do atacante"; else if (!xUp) b.state = "vitória do defensor";
    }
  }
  return fighting;
}
const sum = (ds: Division[]) => ds.reduce((s, d) => s + d.strength, 0);

/**
 * Suprimento além-mar: exército em outro continente que o depósito mais perto depende de comboio. Chega uma parte;
 * escolta própria ajuda; frotas inimigas perto (interceptação, submarinos) e tempestade atrapalham. 1 = não depende de mar.
 */
export function convoyFactor(w: World, e: Economy, d: Division, depot: number, atWar: (a: number, b: number) => boolean) {
  if (depot < 0 || !w.continent || w.continent[depot] === w.continent[d.hex]) return 1;
  const near = (f: Division) => Math.abs(((f.hex / w.W) | 0) - ((d.hex / w.W) | 0)) <= SEA.convoy.reach * 3 && Math.min(Math.abs((f.hex % w.W) - (d.hex % w.W)), w.W - Math.abs((f.hex % w.W) - (d.hex % w.W))) <= SEA.convoy.reach * 3;
  const fleets = e.divisions.filter((f) => f.kind === "fleet" && f.strength >= 1);
  const escort = fleets.filter((f) => f.country === d.country && missionOfFleet(f) === "Escolta de comboios").reduce((s, f) => s + f.strength * craftOf(SHIPS, f.unit).power, 0);
  const enemy = fleets.filter((f) => atWar(f.country, d.country) && near(f)).reduce((s, f) => s + f.strength * craftOf(SHIPS, f.unit).power * (craftOf(SHIPS, f.unit).name === "Submarinos" ? 1.5 : 1), 0);
  let k = SEA.convoy.base + (escort > 0 ? SEA.convoy.escort : 0);
  if (enemy > 0) k *= 1 - SEA.convoy.interdiction * enemy / (enemy + escort);
  let coast = -1;
  for (let r = 1; r <= 3 && coast < 0; r++) for (const dx of [-r, r]) { const j = d.hex + dx; if (j >= 0 && j < w.W * w.H && w.terrain[j] === T.OCEAN) coast = j; }
  if (coast >= 0 && seaWeather(w, coast, e.week) === "tempestade") k *= SEA.convoy.storm;
  return Math.max(0, Math.min(1, k));
}

/** Bombardeio costeiro: frota com essa missão na zona colada ao hex da batalha dá +1 ao lado dela. */
export function bombardMods(w: World, e: Economy, b: Battle, country: number): [string, number][] {
  const zones = new Set<number>();
  for (const dx of [-1, 1, -w.W, w.W]) { const j = b.hex + dx; if (j >= 0 && j < w.W * w.H && w.terrain[j] === T.OCEAN) zones.add(w.seaZone[j]); }
  return e.divisions.some((f) => f.kind === "fleet" && f.country === country && f.strength >= 1 && missionOfFleet(f) === "Bombardeio costeiro" && zones.has(w.seaZone[f.hex])) ? [["Bombardeio naval", SEA.bombard]] : [];
}
