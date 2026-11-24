// Comandos do jogador. Toda ação que muda a partida passa por aqui, para valer igual no single-player,
// no servidor e em todos os navegadores do multiplayer (lockstep). Cada comando só age sobre o país de quem mandou.
import {
  build, foundCity, trainSettlers, transferSize, urbanize, buildRoad, buildHarbor, proposePact, cancelPact, type Economy,
} from "./economy.ts";
import { recruit, buildFleet, buildAir, orderMove, declareWar, makePeace, disband } from "./war.ts";
import { proposeLaw, cancelLaw } from "./politics.ts";
import { validFlag, type Flag } from "./flags.ts";
import { EVENT_LIST, resolve } from "./choices.ts";
import { addIncentive, removeIncentive, INCENTIVES, type IncentiveKind } from "./admin.ts";
import { createState, addCityToState, removeCityFromState, setStateTax } from "./states.ts";
import { available } from "./tech.ts";
import type { World } from "./world.ts";

export type Cmd =
  | { t: "build"; i: number; b: number }
  | { t: "found"; unit: number; name?: string; flag?: Flag }
  | { t: "settlers" }
  | { t: "transfer"; from: number; to: number }
  | { t: "urbanize"; city: number; hex: number }
  | { t: "road"; city: number }
  | { t: "harbor"; city: number }
  | { t: "acceptCulture"; culture: number; off?: boolean }
  | { t: "choose"; option: number } // resposta ao evento pendente
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
  | { t: "stateNew"; city: number; name?: string; flag?: Flag }
  | { t: "stateJoin"; city: number; state: number }
  | { t: "stateLeave"; city: number }
  | { t: "stateTax"; state: number; law: string | null }
  | { t: "identity"; name: string; color: [number, number, number]; flag: Flag } // nome, cor e bandeira do país
  | { t: "rename"; kind: "city" | "state"; id: number; name: string; flag?: Flag }
  | { t: "continent"; id: number; name: string } // renomear continente
  | { t: "incentive"; cities: number[]; kind: IncentiveKind; off?: boolean } // liga/desliga incentivo
  | { t: "claim" }   // jogador assume o país (sai da IA)
  | { t: "release" }; // jogador sai: o país volta para a IA

const isInt = (v: unknown, min = 0) => Number.isInteger(v) && (v as number) >= min;
/** Nome digitado por um jogador: sem HTML nem controle, até 30 letras. "" = inválido. */
export const cleanName = (v: unknown) => (typeof v === "string" ? v.replace(/[<>&"'\u0000-\u001f]/g, "").trim().slice(0, 30) : "");

/** Aceitar uma cultura custa pontos administrativos (a burocracia passa a atender essa gente). */
export const ACCEPT_COST = 40;

/** Nome e bandeira escolhidos pelo jogador (ignorados se inválidos: fica o padrão). */
function name(target: { name: string; flag?: Flag }, c: { name?: string; flag?: Flag }) {
  const n = cleanName(c.name);
  if (n) target.name = n;
  if (validFlag(c.flag)) target.flag = { ...c.flag, colors: [...c.flag.colors] };
}

/** Aplica o comando em nome de `country`. Retorna erro (mensagem para o jogador) ou null. */
export function applyCommand(w: World, e: Economy, country: number, c: Cmd): string | null {
  if (!isInt(country, 1) || country > e.countries.length) return "País inválido";
  const co = e.countries[country - 1];
  const own = (id: number) => e.divisions.find((d) => d.id === id && d.country === country);
  const ownCity = (k: number) => isInt(k) && e.cities[k]?.country === country;
  switch (c?.t) {
    case "build": return isInt(c.i) && w.owner[c.i] === country ? build(w, e, c.i, c.b) : "Hex não é seu";
    case "found": {
      if (!own(c.unit)) return "Unidade não é sua";
      const err = foundCity(w, e, c.unit);
      if (!err) name(e.cities[e.cities.length - 1], c);
      return err;
    }
    case "settlers": return trainSettlers(w, e, country);
    case "choose": {
      const ev = e.choices?.[country];
      if (!ev) return "Nenhum evento esperando";
      if (!isInt(c.option) || c.option >= EVENT_LIST[ev.id].options.length) return "Opção inválida";
      resolve(w, e, country, ev.id, c.option);
      return null;
    }
    case "acceptCulture": {
      if (!isInt(c.culture, 1) || c.culture === co.primaryCulture) return "Cultura inválida";
      if (c.off) { co.acceptedCultures = (co.acceptedCultures ?? []).filter((x) => x !== c.culture); return null; }
      if ((co.acceptedCultures ?? []).includes(c.culture)) return "Já aceita";
      if ((co.admin ?? 0) < ACCEPT_COST) return `Precisa de ${ACCEPT_COST} pontos administrativos`;
      co.admin! -= ACCEPT_COST;
      co.acceptedCultures = [...(co.acceptedCultures ?? []), c.culture];
      return null;
    }
    case "harbor": return ownCity(c.city) ? buildHarbor(e, c.city) : "Cidade não é sua";
    case "road": return ownCity(c.city) ? buildRoad(e, c.city) : "Cidade não é sua";
    case "urbanize": return ownCity(c.city) && isInt(c.hex) && c.hex < w.W * w.H ? urbanize(w, e, c.city, c.hex) : "Cidade não é sua";
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
    case "stateNew": {
      const err = createState(e, country, c.city);
      if (!err) name(e.states[e.states.length - 1], c);
      return err;
    }
    case "stateJoin": return ownCity(c.city) && e.states.some((s) => s.id === c.state && s.country === country) ? addCityToState(e, c.city, c.state) : "Estado não é seu";
    case "stateLeave": return ownCity(c.city) ? removeCityFromState(e, c.city) : "Cidade não é sua";
    case "stateTax": return e.states.some((s) => s.id === c.state && s.country === country) ? setStateTax(e, c.state, c.law) : "Estado não é seu";
    case "identity": {
      const name = cleanName(c.name);
      if (!name || !Array.isArray(c.color) || c.color.length !== 3 || !c.color.every((v) => isInt(v) && v <= 255) || !validFlag(c.flag)) return "Identidade inválida";
      Object.assign(w.countries[country - 1], { name, color: [...c.color], flag: { ...c.flag, colors: [...c.flag.colors] } });
      e.version++; // redesenha o mapa com a cor nova
      return null;
    }
    case "rename": {
      const name = cleanName(c.name);
      if (!name) return "Nome inválido";
      const target = c.kind === "city" ? (ownCity(c.id) ? e.cities[c.id] : null) : e.states.find((s) => s.id === c.id && s.country === country);
      if (!target) return "Não é seu";
      target.name = name;
      if (validFlag(c.flag)) target.flag = { ...c.flag, colors: [...c.flag.colors] };
      return null;
    }
    case "incentive": {
      if (!Array.isArray(c.cities) || !c.cities.every((k) => ownCity(k)) || !(c.kind in INCENTIVES)) return "Incentivo inválido";
      if (c.off) { for (const k of c.cities) removeIncentive(e, country, k, c.kind); return null; }
      return addIncentive(e, country, c.cities, c.kind);
    }
    case "continent": {
      const name = cleanName(c.name), k = w.continents?.[c.id - 1];
      if (!name || !k) return "Continente inválido";
      k.name = name;
      return null;
    }
    case "claim": if (!e.humans.includes(country)) e.humans.push(country); return null;
    case "release": e.humans = e.humans.filter((k) => k !== country); return null;
    default: return "Comando desconhecido";
  }
}
