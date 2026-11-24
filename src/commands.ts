// Comandos do jogador. Toda ação que muda a partida passa por aqui, para valer igual no single-player,
// no servidor e em todos os navegadores do multiplayer (lockstep). Cada comando só age sobre o país de quem mandou.
import {
  build, foundCity, trainSettlers, transferSize, proposePact, cancelPact, type Economy,
} from "./economy.ts";
import { recruit, buildFleet, buildAir, orderMove, declareWar, makePeace, disband } from "./war.ts";
import { proposeLaw, cancelLaw } from "./politics.ts";
import { createState, addCityToState, removeCityFromState, setStateTax } from "./states.ts";
import { available } from "./tech.ts";
import type { World } from "./world.ts";

export type Cmd =
  | { t: "build"; i: number; b: number }
  | { t: "found"; unit: number }
  | { t: "settlers" }
  | { t: "transfer"; from: number; to: number }
  | { t: "tech"; name: string }
  | { t: "law"; cat: string; name: string }
  | { t: "cancelLaw" }
  | { t: "recruit"; hex: number }
  | { t: "fleet"; hex: number }
  | { t: "air"; hex: number }
  | { t: "move"; id: number; target: number }
  | { t: "disband"; id: number }
  | { t: "war"; target: number }
  | { t: "peace"; target: number }
  | { t: "pact"; target: number }
  | { t: "unpact"; target: number }
  | { t: "stateNew"; city: number }
  | { t: "stateJoin"; city: number; state: number }
  | { t: "stateLeave"; city: number }
  | { t: "stateTax"; state: number; law: string | null }
  | { t: "claim" }   // jogador assume o país (sai da IA)
  | { t: "release" }; // jogador sai: o país volta para a IA

const isInt = (v: unknown, min = 0) => Number.isInteger(v) && (v as number) >= min;

/** Aplica o comando em nome de `country`. Retorna erro (mensagem para o jogador) ou null. */
export function applyCommand(w: World, e: Economy, country: number, c: Cmd): string | null {
  if (!isInt(country, 1) || country > e.countries.length) return "País inválido";
  const co = e.countries[country - 1];
  const own = (id: number) => e.divisions.find((d) => d.id === id && d.country === country);
  const ownCity = (k: number) => isInt(k) && e.cities[k]?.country === country;
  switch (c?.t) {
    case "build": return isInt(c.i) && w.owner[c.i] === country ? build(w, e, c.i, c.b) : "Hex não é seu";
    case "found": return own(c.unit) ? foundCity(w, e, c.unit) : "Unidade não é sua";
    case "settlers": return trainSettlers(w, e, country);
    case "transfer": return ownCity(c.from) && ownCity(c.to) ? transferSize(w, e, c.from, c.to) : "Cidade não é sua";
    case "tech": {
      if (!available(co.research).some((t) => t.name === c.name)) return "Tecnologia indisponível";
      co.research.researching = c.name;
      return null;
    }
    case "law": return proposeLaw(co.politics, c.cat, c.name, co.research.era);
    case "cancelLaw": cancelLaw(co.politics); return null;
    case "recruit": return recruit(w, e, country, c.hex);
    case "fleet": return buildFleet(w, e, country, c.hex);
    case "air": return buildAir(w, e, country, c.hex);
    case "move": return own(c.id) && isInt(c.target) && c.target < w.W * w.H ? orderMove(w, e, c.id, c.target) : "Unidade não é sua";
    case "disband": if (!own(c.id)) return "Unidade não é sua"; disband(w, e, c.id); return null;
    case "war": return isInt(c.target, 1) && c.target <= e.countries.length ? declareWar(e, country, c.target) : "País inválido";
    case "peace": return isInt(c.target, 1) && c.target <= e.countries.length ? makePeace(w, e, country, c.target) : "País inválido";
    case "pact": return isInt(c.target, 1) && c.target <= e.countries.length ? proposePact(e, country, c.target) : "País inválido";
    case "unpact": cancelPact(e, country, c.target); return null;
    case "stateNew": return createState(e, country, c.city);
    case "stateJoin": return ownCity(c.city) && e.states.some((s) => s.id === c.state && s.country === country) ? addCityToState(e, c.city, c.state) : "Estado não é seu";
    case "stateLeave": return ownCity(c.city) ? removeCityFromState(e, c.city) : "Cidade não é sua";
    case "stateTax": return e.states.some((s) => s.id === c.state && s.country === country) ? setStateTax(e, c.state, c.law) : "Estado não é seu";
    case "claim": if (!e.humans.includes(country)) e.humans.push(country); return null;
    case "release": e.humans = e.humans.filter((k) => k !== country); return null;
    default: return "Comando desconhecido";
  }
}
