import { orderShip, cancelShip } from "./naval.ts";
import { BUILDINGS } from "./economy.ts";
// Comandos do jogador. Toda ação que muda a partida passa por aqui, para valer igual no single-player,
// no servidor e em todos os navegadores do multiplayer (lockstep). Cada comando só age sobre o país de quem mandou.
import { setMethod, methodKey } from "./methods.ts";
import { privatize, nationalize } from "./firms.ts";
import { queueBuild, cancelProject, pauseProject } from "./construction.ts";
import { toggleRiver } from "./navigation.ts";
import {
  build, foundCity, trainSettlers, transferSize, urbanize, buildRoad, buildHarbor, proposePact, cancelPact, type Economy,
} from "./economy.ts";
import { recruit, buildFleet, buildAir, orderMove, declareWar, makePeace, disband, frontOrder } from "./war.ts";
import { proposeLaw, cancelLaw } from "./politics.ts";
import { validFlag, type Flag } from "./flags.ts";
import { EVENT_LIST, resolve } from "./choices.ts";
import { improveRelations } from "./diplomacy.ts";
import { proposeSubject, releaseSubject, SUBJECT_KINDS, type SubjectKind } from "./subjects.ts";
import { addProposal, respond, startVote, castVote } from "./proposals.ts";
import { hireGeneral } from "./characters.ts";
import { buildOutpost } from "./expansion.ts";
import { addIncentive, removeIncentive, INCENTIVES, type IncentiveKind } from "./admin.ts";
import { createState, addCityToState, removeCityFromState, setStateTax } from "./states.ts";
import { available } from "./tech.ts";
import type { World } from "./world.ts";

export type Cmd =
  | { t: "build"; i: number; b: number; priv?: boolean }
  | { t: "buildMany"; hexes: number[]; b: number; levels: number; priv?: boolean } // construção em massa
  | { t: "cancelBuild"; id: number } | { t: "pauseBuild"; id: number } | { t: "cancelShip"; id: number }
  | { t: "method"; hex: number; b: number; cat: number; k: number; all?: boolean } // método de produção (all: todos os edifícios b do país)
  | { t: "privatize"; hex: number; b: number; n: number } | { t: "nationalize"; hex: number; b: number; n: number }
  | { t: "found"; unit: number; name?: string; flag?: Flag }
  | { t: "outpost"; unit: number } // colonos viram posto avançado
  | { t: "settlers" }
  | { t: "transfer"; from: number; to: number }
  | { t: "urbanize"; city: number; hex: number }
  | { t: "road"; city: number }
  | { t: "harbor"; city: number }
  | { t: "acceptCulture"; culture: number; off?: boolean }
  | { t: "choose"; option: number }
  | { t: "improve"; target: number } // melhorar relações
  | { t: "subject"; target: number; kind: SubjectKind } // propor dependência (o outro vira súdito)
  | { t: "freeSubject"; target: number } // soberano solta o súdito
  | { t: "independence" }            // súdito rompe com o soberano
  | { t: "respond"; id: number; accept: boolean } // responder proposta de outro jogador
  | { t: "vote"; id: number; yes: boolean } // votar num nome (multiplayer)
  | { t: "river"; id: number; name: string } // renomear rio navegável
  | { t: "closeRiver"; id: number } // fechar/reabrir rio ao comércio dos outros (quem tem a foz)
  | { t: "saveCharacter"; id: number } // guardar na história (o livro continua depois da morte) // resposta ao evento pendente
  | { t: "tech"; name: string }
  | { t: "law"; cat: string; name: string }
  | { t: "cancelLaw" }
  | { t: "recruit"; hex: number; unit?: string }
  | { t: "general"; id: number } // contratar general para a divisão
  | { t: "front"; ids: number[]; enemy: number; mode: "defend" | "attack" } // ordem de frente para um grupo
  | { t: "fleet"; hex: number; unit?: string }
  | { t: "air"; hex: number; unit?: string }
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
    case "build": return isInt(c.i) && w.owner[c.i] === country ? queueBuild(w, e, c.i, c.b, !!c.priv) : "Hex não é seu";
    case "buildMany": { // construção em massa: n níveis em cada hex da lista; para no primeiro erro de fila cheia
      if (!Array.isArray(c.hexes) || c.hexes.length > 2000 || !isInt(c.levels, 1) || c.levels > 50) return "Pedido inválido";
      let ok = 0, err: string | null = null;
      for (const i of c.hexes) for (let n = 0; n < c.levels; n++) {
        if (!isInt(i) || w.owner[i] !== country) { err = "Hex não é seu"; break; }
        const r = queueBuild(w, e, i, c.b, !!c.priv);
        if (r) { err = r; break; }
        ok++;
      }
      return ok ? null : err ?? "Nada para construir";
    }
    case "method": {
      if (!isInt(c.b) || !BUILDINGS[c.b] || !isInt(c.cat) || !Number.isInteger(c.k)) return "Método inválido";
      const known = e.countries[country - 1].research.known;
      if (!c.all) return isInt(c.hex) && w.owner[c.hex] === country && e.levels[c.b][c.hex] ? setMethod(e, methodKey(c.hex, c.b), BUILDINGS[c.b].name, c.cat, c.k, known) : "Edifício não é seu";
      let err: string | null = "Nenhum edifício desse tipo";
      for (const i of e.owned) if (w.owner[i] === country && e.levels[c.b][i]) err = setMethod(e, methodKey(i, c.b), BUILDINGS[c.b].name, c.cat, c.k, known);
      return err;
    }
    case "privatize": return isInt(c.hex) && isInt(c.b) && isInt(c.n, 1) ? privatize(w, e, country, c.hex, c.b, c.n) : "Pedido inválido";
    case "nationalize": return isInt(c.hex) && isInt(c.b) && isInt(c.n, 1) ? nationalize(w, e, country, c.hex, c.b, c.n) : "Pedido inválido";
    case "cancelBuild": return isInt(c.id, 1) ? cancelProject(e, country, c.id) : "Obra inválida";
    case "pauseBuild": return isInt(c.id, 1) ? pauseProject(e, country, c.id) : "Obra inválida";
    case "outpost": return own(c.unit) ? buildOutpost(w, e, c.unit) : "Unidade não é sua";
    case "found": {
      if (!own(c.unit)) return "Unidade não é sua";
      const err = foundCity(w, e, c.unit);
      if (!err) name(e.cities[e.cities.length - 1], c);
      return err;
    }
    case "settlers": return trainSettlers(w, e, country);
    case "saveCharacter": { const ch = e.characters?.find((x) => x.id === c.id && x.country === country); if (!ch) return "Personagem não é seu"; ch.saved = true; return null; }
    case "subject": {
      if (!isInt(c.target, 1) || c.target > e.countries.length || !(c.kind in SUBJECT_KINDS)) return "Proposta inválida";
      return e.humans.includes(c.target) && c.target !== country ? addProposal(e, { from: country, to: c.target, kind: "subject", subject: c.kind }) : proposeSubject(e, country, c.target, c.kind);
    }
    case "respond": return isInt(c.id, 1) ? respond(e, country, c.id, !!c.accept) : "Resposta inválida";
    case "freeSubject": return e.subjects?.[c.target]?.overlord === country ? releaseSubject(e, c.target, true) : "Não é seu súdito";
    case "independence": return e.subjects?.[country] ? releaseSubject(e, country, false) : "Você não é súdito";
    case "improve": return isInt(c.target, 1) && c.target <= e.countries.length ? improveRelations(e, country, c.target) : "País inválido";
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
    case "recruit": return recruit(w, e, country, c.hex, typeof c.unit === "string" ? c.unit : undefined);
    case "front": return Array.isArray(c.ids) && c.ids.length <= 500 && c.ids.every((x) => isInt(x)) && isInt(c.enemy, 1) && (c.mode === "defend" || c.mode === "attack") ? frontOrder(w, e, country, c.ids, c.enemy, c.mode) : "Ordem inválida";
    case "general": return own(c.id) ? hireGeneral(w, e, c.id) : "Unidade não é sua";
    case "fleet": return isInt(c.hex) && e.market[c.hex] ? orderShip(w, e, country, e.market[c.hex] - 1, typeof c.unit === "string" ? c.unit : "Galés") : "Escolha uma cidade sua no litoral"; // vai para a fila naval
    case "cancelShip": return isInt(c.id, 1) ? cancelShip(e, country, c.id) : "Encomenda inválida";
    case "air": return buildAir(w, e, country, c.hex, typeof c.unit === "string" ? c.unit : undefined);
    case "move": return own(c.id) && isInt(c.target) && c.target < w.W * w.H ? orderMove(w, e, c.id, c.target) : "Unidade não é sua";
    case "disband": if (!own(c.id)) return "Unidade não é sua"; disband(w, e, c.id); return null;
    case "war": return isInt(c.target, 1) && c.target <= e.countries.length ? declareWar(e, country, c.target) : "País inválido";
    case "peace": return isInt(c.target, 1) && c.target <= e.countries.length ? makePeace(w, e, country, c.target) : "País inválido";
    case "pact": {
      if (!isInt(c.target, 1) || c.target > e.countries.length) return "País inválido";
      return e.humans.includes(c.target) && c.target !== country ? addProposal(e, { from: country, to: c.target, kind: "pact" }) : proposePact(e, country, c.target);
    }
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
      if (e.humans.length > 1) return startVote(e, country, c.id, name); // multiplayer: os jogadores votam
      k.name = name;
      return null;
    }
    case "vote": return isInt(c.id, 1) ? castVote(e, country, c.id, !!c.yes, (ct, name, river) => { const k = (river ? w.rivers : w.continents)?.[ct - 1]; if (k) k.name = name; }) : "Voto inválido";
    case "river": {
      const name = cleanName(c.name), k = w.rivers?.[c.id - 1];
      if (!name || !k) return "Rio inválido";
      if (e.humans.length > 1) return startVote(e, country, c.id, name, true); // multiplayer: os jogadores votam
      k.name = name;
      return null;
    }
    case "closeRiver": return isInt(c.id, 1) ? toggleRiver(w, e, country, c.id) : "Rio inválido";
    case "claim": if (!e.humans.includes(country)) e.humans.push(country); return null;
    case "release": e.humans = e.humans.filter((k) => k !== country); return null;
    default: return "Comando desconhecido";
  }
}
