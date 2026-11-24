// Claims (reivindicações sobre cidades de outros países) e o caráter da IA (personalidade + desejos).
// Claim = justificativa: guerra contra quem você reivindica dá menos infâmia, e a IA prefere esses alvos.
// Desejo = objetivo do país (o que a IA persegue). Personalidade muda o quanto ela arrisca, comercia e expande.
import type { World } from "./world.ts";
import type { Economy } from "./economy.ts";
import { relation, addRelation } from "./diplomacy.ts";

export type ClaimType = "Histórico" | "Cultural" | "Estratégico";
export type Claim = { country: number; city: number; type: ClaimType; strength: number };

export const CLAIM = {
  historic: 80, cultural: 60, strategic: 35, // força inicial por tipo
  decayYear: 2,      // pontos de força perdidos por ano (claim velho perde peso)
  relationMonth: -0.3, // quem é reivindicado gosta menos de quem reivindica (por claim, por mês)
  infamyCut: 0.5,    // guerra contra quem você reivindica: metade da infâmia
};

export const PERSONALITIES = {
  "Expansionista": { war: 2, pact: 0.7, subject: 1.5, desc: "quer terra: guerra fácil, pouco comércio" },
  "Comercial": { war: 0.5, pact: 2, subject: 1, desc: "quer mercados: acordos e portos" },
  "Defensivo": { war: 0.3, pact: 1, subject: 0.5, desc: "quer segurança: evita guerra" },
  "Diplomático": { war: 0.5, pact: 1.5, subject: 2, desc: "quer influência: dependentes e alianças" },
  "Revanchista": { war: 1.5, pact: 0.8, subject: 0.8, desc: "quer de volta o que perdeu" },
} as const;
export type Personality = keyof typeof PERSONALITIES;
/** Personalidade fixa do país (pela semente; quem perdeu muita terra vira revanchista). */
export function personality(w: World, e: Economy, k: number): Personality {
  if ((e.claims ?? []).some((c) => c.country === k && c.type === "Histórico" && c.strength > 50)) return "Revanchista";
  const names = Object.keys(PERSONALITIES).filter((p) => p !== "Revanchista") as Personality[];
  return names[((w.seed * 31 + k * 977) >>> 0) % names.length];
}

export const claimsOf = (e: Economy, k: number) => (e.claims ?? []).filter((c) => c.country === k);
export const hasClaimOn = (e: Economy, a: number, b: number) => (e.claims ?? []).some((c) => c.country === a && e.cities[c.city]?.country === b);

function add(e: Economy, country: number, city: number, type: ClaimType, strength: number) {
  const list = (e.claims ??= []), old = list.find((c) => c.country === country && c.city === city);
  if (old) { if (strength > old.strength) { old.strength = strength; old.type = type; } return; }
  list.push({ country, city, type, strength });
}

/** Perdeu uma cidade na paz: claim histórico sobre ela. */
export const lostCity = (e: Economy, country: number, city: number) => add(e, country, city, "Histórico", CLAIM.historic);

/** Uma vez por ano: claims culturais (cidade vizinha de maioria da nossa cultura) e estratégicos (cidade vizinha no litoral
 * quando não temos litoral); os velhos perdem força; reivindicado gosta menos de quem reivindica. */
export function stepClaims(w: World, e: Economy) {
  for (const c of e.claims ?? []) c.strength -= CLAIM.decayYear;
  e.claims = (e.claims ?? []).filter((c) => c.strength > 0 && e.cities[c.city] && e.cities[c.city].country !== c.country); // retomou ou acabou
  e.cities.forEach((city, k) => {
    for (const n of e.contacts?.[city.country - 1] ?? []) {
      const top = city.identity ? +Object.entries(city.identity.culture).sort((a, b) => b[1] - a[1])[0][0] : 0;
      if (top && top === e.countries[n - 1].primaryCulture) add(e, n, k, "Cultural", CLAIM.cultural);
      else if (city.coast && !e.cities.some((x) => x.country === n && x.coast)) add(e, n, k, "Estratégico", CLAIM.strategic);
    }
  });
  for (const c of e.claims ?? []) addRelation(e, c.country, e.cities[c.city].country, CLAIM.relationMonth * 12);
}

/** Desejos do país (o que ele persegue), do mais importante para o menos. */
export function desires(w: World, e: Economy, k: number): string[] {
  const out: string[] = [], p = personality(w, e, k);
  for (const c of claimsOf(e, k).sort((a, b) => b.strength - a.strength).slice(0, 2))
    out.push(`${c.type === "Histórico" ? "Recuperar" : c.type === "Cultural" ? "Unir o povo de" : "Tomar o porto de"} ${e.cities[c.city].name}`);
  const neighbors = e.contacts?.[k - 1] ?? [];
  if (p === "Comercial") out.push("Acordos comerciais com todos os vizinhos");
  if (p === "Diplomático" && neighbors.length) out.push("Tornar um vizinho dependente");
  if (p === "Defensivo") out.push("Manter a paz nas fronteiras");
  if (p === "Expansionista" && neighbors.length) out.push("Expandir sobre o vizinho mais fraco");
  const enemy = [...neighbors].sort((a, b) => relation(e, k, a) - relation(e, k, b))[0]; // cópia: não bagunçar e.contacts
  if (enemy && relation(e, k, enemy) < -30) out.push(`Enfraquecer o rival (§${enemy}§)`);
  return out;
}
