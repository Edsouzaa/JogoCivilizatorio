// Eventos aleatórios com escolha. Saem na simulação (determinísticos: iguais no servidor e em todo navegador).
// País da IA escolhe na hora; país de jogador fica com o evento pendente: o jogo pausa e ele tem 2 minutos
// para escolher (no multiplayer o servidor escolhe a 1ª opção se o tempo acabar).
import { mulberry32, type World } from "./world.ts";
import type { Economy } from "./economy.ts";

export type Effects = { treasury?: number; legitimacy?: number; pop?: number; research?: number; admin?: number; infamy?: number };
export type ChoiceEvent = { title: string; text: string; minEra?: number; options: { label: string; fx: Effects }[] };

export const CHOICES = { chanceMonth: 0.04, timeoutMs: 120_000 };

/** Valores de dinheiro/pesquisa são frações (do tesouro e da pesquisa da semana × 10), para valer em qualquer era. */
export const EVENT_LIST: ChoiceEvent[] = [
  { title: "Colheita farta", text: "Os celeiros transbordam este ano.", options: [
    { label: "Vender o excedente", fx: { treasury: 0.15 } },
    { label: "Fazer uma grande festa", fx: { legitimacy: 0.05 } },
  ] },
  { title: "Profeta nas ruas", text: "Um pregador atrai multidões e critica o governo.", options: [
    { label: "Prendê-lo", fx: { legitimacy: -0.03, infamy: 1 } },
    { label: "Ouvi-lo em conselho", fx: { legitimacy: 0.02, treasury: -0.05 } },
    { label: "Ignorar", fx: { legitimacy: -0.05 } },
  ] },
  { title: "Estrangeiro sábio", text: "Um viajante traz conhecimentos de terras distantes.", options: [
    { label: "Dar-lhe uma casa e alunos", fx: { research: 1, treasury: -0.05 } },
    { label: "Mandá-lo embora", fx: {} },
  ] },
  { title: "Incêndio na cidade", text: "Um fogo destrói casas e armazéns.", options: [
    { label: "Reconstruir com o tesouro", fx: { treasury: -0.15, legitimacy: 0.02 } },
    { label: "Cada um que se vire", fx: { pop: -0.02, legitimacy: -0.04 } },
  ] },
  { title: "Bandidos nas estradas", text: "Caravanas são atacadas perto da fronteira.", options: [
    { label: "Mandar soldados", fx: { treasury: -0.08 } },
    { label: "Pagar proteção", fx: { treasury: -0.04, legitimacy: -0.02 } },
  ] },
  { title: "Escrivães pedem aumento", text: "Os escrivães ameaçam parar.", minEra: 1, options: [
    { label: "Pagar", fx: { treasury: -0.08, admin: 10 } },
    { label: "Recusar", fx: { admin: -15 } },
  ] },
  { title: "Mina de ouro descoberta", text: "Mineiros acharam ouro nas colinas.", minEra: 1, options: [
    { label: "Do Estado", fx: { treasury: 0.2, legitimacy: -0.02 } },
    { label: "Dos mineiros", fx: { legitimacy: 0.04, treasury: 0.05 } },
  ] },
];

/** Aplica a opção escolhida. */
export function applyChoice(e: Economy, country: number, ev: ChoiceEvent, option: number) {
  const c = e.countries[country - 1], fx = ev.options[option].fx;
  c.treasury = Math.max(0, c.treasury + (fx.treasury ?? 0) * Math.max(100, c.treasury));
  c.politics.legitimacy = Math.min(1, Math.max(0, c.politics.legitimacy + (fx.legitimacy ?? 0)));
  c.admin = Math.max(0, (c.admin ?? 0) + (fx.admin ?? 0));
  c.infamy += fx.infamy ?? 0;
  if (fx.research && c.research.researching) c.research.progress.set(c.research.researching, (c.research.progress.get(c.research.researching) ?? 0) + fx.research * c.researchWeek * 10);
  return fx.pop ?? 0; // perda de gente: quem chama aplica no mapa
}

/** Uma vez por semana: sorteia eventos (um a cada ~2 anos por país). IA escolhe na hora. */
export function stepChoices(w: World, e: Economy) {
  if (e.week % 4 !== 0) return;
  const rand = mulberry32(w.seed * 4099 + e.week);
  e.choices ??= {};
  e.countries.forEach((c, ci) => {
    const k = ci + 1;
    if (e.choices![k] || rand() >= CHOICES.chanceMonth || !e.cities.some((x) => x.country === k)) return;
    const pool = EVENT_LIST.map((_, j) => j).filter((j) => (EVENT_LIST[j].minEra ?? 0) <= c.research.era);
    const id = pool[Math.floor(rand() * pool.length)];
    if (e.humans.includes(k)) { e.choices![k] = { id, week: e.week }; return; }
    resolve(w, e, k, id, Math.floor(rand() * EVENT_LIST[id].options.length));
  });
}

/** Escolhe a opção do evento `id` para o país (aplica e tira o pendente). */
export function resolve(w: World, e: Economy, country: number, id: number, option: number) {
  const loss = applyChoice(e, country, EVENT_LIST[id], option);
  if (loss) for (const i of e.owned) if (w.owner[i] === country) w.pop[i] *= 1 + loss;
  if (e.choices) delete e.choices[country];
}
