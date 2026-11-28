// Retrato caricatural em SVG (estilo de animação histórica 2D): cabeça grande, contorno grosso, poucas formas.
// Rosto, nariz, olhos, sobrancelhas, boca e cabelo variam pelo personagem; traços físicos aparecem (cicatriz,
// tapa-olho, calvo, barba longa, grisalho); o chapéu vem do cargo e da era (nada moderno em era antiga).
// Determinístico e pequeno: gerado na hora a partir dos dados salvos (não precisa guardar imagem).
import type { Character } from "./characters.ts";

const SKIN = ["#f1d2b6", "#dcb08a", "#b98559", "#8a5a36", "#5e3b22"];
const HAIR = ["#1e1a17", "#4a3220", "#8a5a2b", "#c9a15a", "#a9a39b"];
// roupa por era: tribal (pele/couro), clássica (toga), medieval, renascença, descobertas, revoluções, industrial, guerras, multipolar, moderna
const CLOTH = ["#7a5a3a", "#d8d0bd", "#5b3a5e", "#7a2e2e", "#2e4a6b", "#2f3a5a", "#2b2b2b", "#4a5a3a", "#3a3f4a", "#2a3550"];
const INK = "#1a1410";

/** Chapéu pelo cargo e pela era. */
function hat(c: Character, era: number, hair: string) {
  const general = c.role === "General" || !!c.command, ruler = !c.role && !c.command && !c.exiledTo && !c.gone;
  const o = `stroke="${INK}" stroke-width="1.4"`;
  if (ruler) {
    if (era === 0) return `<path d="M17 18 Q32 12 47 18 L47 21 Q32 15 17 21Z" fill="#8a5a2b" ${o}/><path d="M40 16 L46 3 L44 16Z" fill="#d8c070" ${o}/>`; // faixa com pena
    if (era === 1) return `<path d="M17 20 Q32 10 47 20" fill="none" stroke="#5a8a3a" stroke-width="3.5"/><path d="M19 19 l-2 -3 M24 15 l-1 -3 M40 15 l1 -3 M45 19 l2 -3" stroke="#5a8a3a" stroke-width="2"/>`; // louros
    if (era <= 5) return `<path d="M18 17 L20 6 L26 12 L32 4 L38 12 L44 6 L46 17Z" fill="#e3b93c" ${o}/><circle cx="32" cy="10" r="1.8" fill="#b33"/>`; // coroa
    return `<rect x="21" y="2" width="22" height="13" rx="1" fill="#2a2a2a" ${o}/><rect x="16" y="14" width="32" height="3.5" rx="1.5" fill="#2a2a2a" ${o}/>`; // cartola
  }
  if (general) {
    if (era === 0) return `<path d="M18 19 Q32 11 46 19" fill="none" stroke="#e8e0c8" stroke-width="3"/><circle cx="24" cy="15" r="1.6" fill="#e8e0c8"/><circle cx="40" cy="15" r="1.6" fill="#e8e0c8"/>`; // faixa com ossos
    if (era === 1) return `<path d="M17 22 Q17 7 32 7 Q47 7 47 22Z" fill="#b08a3a" ${o}/><path d="M22 7 Q32 -3 42 7" fill="#b33" ${o}/>`; // elmo com crista
    if (era <= 3) return `<path d="M15 20 Q32 2 49 20 Q32 16 15 20Z" fill="#8a8f96" ${o}/>`; // capacete de ferro
    if (era <= 5) return `<path d="M12 17 Q32 2 52 17 Q32 12 12 17Z" fill="#222" ${o}/><circle cx="32" cy="10" r="2" fill="#c33"/>`; // bicorne
    if (era <= 7) return `<path d="M19 18 V9 Q32 5 45 9 V18Z" fill="#4a5a3a" ${o}/><path d="M17 18 H38 Q36 22 17 21Z" fill="#222" ${o}/>`; // quepe
    return `<path d="M17 18 Q18 8 33 8 Q47 9 47 17Z" fill="#3a4a2a" ${o}/>`; // boina/capacete moderno
  }
  if (c.traits.includes("Devoto")) return `<path d="M15 34 Q14 8 32 7 Q50 8 49 34 L45 34 Q45 15 32 14 Q19 15 19 34Z" fill="#5a4a3a" ${o}/>`; // capuz
  if (c.role === "Agitador" && era >= 5) return `<path d="M18 17 Q20 9 32 9 Q44 9 46 15 L50 17Z" fill="#3a3a3a" ${o}/>`; // boné
  return "";
}

export function portraitSVG(c: Character, era: number, size = 64) {
  const L = c.looks ?? ({} as Character["looks"]), skin = SKIN[L.skin ?? 1], grey = c.dead || c.traits.includes("Cabelos grisalhos");
  const hair = HAIR[grey ? 4 : L.hair ?? 0], cloth = CLOTH[Math.min(era, CLOTH.length - 1)], id = c.id ?? 0, p = c.personality ?? "";
  const o = `stroke="${INK}" stroke-width="1.5"`;
  // corpo pequeno (caricatura: cabeça grande)
  const body = [`<path d="M16 64 V55 Q16 49 24 48 H40 Q48 49 48 55 V64Z" fill="${cloth}" ${o}/>`, `<path d="M18 64 Q21 53 25 50 Q32 47 39 50 Q43 53 46 64Z" fill="${cloth}" ${o}/>`,
    `<path d="M11 64 L23 49 H41 L53 64Z" fill="${cloth}" ${o}/>`][L.body ?? 0];
  const medals = c.traits.includes("Herói de guerra") ? `<circle cx="27" cy="56" r="1.8" fill="#e3b93c" stroke="${INK}"/><circle cx="31" cy="57" r="1.8" fill="#e3b93c" stroke="${INK}"/>` : "";
  // rosto: 5 formatos (redondo, quadrado, oval, largo, comprido)
  const face = (L.face ?? 0) + (id % 2) * 3; // mais variedade sem mudar o save
  const head = [`<circle cx="32" cy="29" r="15" fill="${skin}" ${o}/>`, `<rect x="17.5" y="15" width="29" height="29" rx="7" fill="${skin}" ${o}/>`, `<ellipse cx="32" cy="29" rx="13" ry="16" fill="${skin}" ${o}/>`,
    `<ellipse cx="32" cy="30" rx="16.5" ry="13.5" fill="${skin}" ${o}/>`, `<path d="M20 22 Q20 13 32 13 Q44 13 44 22 L43 38 Q38 46 32 46 Q26 46 21 38Z" fill="${skin}" ${o}/>`][face % 5];
  const ears = `<ellipse cx="16.5" cy="30" rx="2.4" ry="3.5" fill="${skin}" ${o}/><ellipse cx="47.5" cy="30" rx="2.4" ry="3.5" fill="${skin}" ${o}/>`;
  // cabelo: curto, comprido, calvo (só a coroa de fios), coque, cacheado
  const style = c.traits.includes("Calvo") ? 2 : (L.hairStyle ?? 0) + (c.female && id % 3 === 0 ? 1 : 0);
  const hairs = [
    `<path d="M17 26 Q16 12 32 12 Q48 12 47 26 Q42 18 32 18 Q22 18 17 26Z" fill="${hair}" ${o}/>`,
    `<path d="M16 44 Q12 12 32 11 Q52 12 48 44 L44 44 Q46 20 32 18 Q18 20 20 44Z" fill="${hair}" ${o}/>`,
    `<path d="M17 31 Q16 25 19 23 M45 23 Q48 25 47 31" stroke="${hair}" stroke-width="3" fill="none"/>`,
    `<path d="M17 26 Q16 13 32 13 Q48 13 47 26 Q42 19 32 19 Q22 19 17 26Z" fill="${hair}" ${o}/><circle cx="32" cy="9" r="4.5" fill="${hair}" ${o}/>`,
    `<path d="M17 27 Q13 20 18 16 Q19 9 27 11 Q32 6 37 11 Q45 9 46 16 Q51 20 47 27 Q42 19 32 19 Q22 19 17 27Z" fill="${hair}" ${o}/>`,
  ][style % 5];
  // olhos grandes com pupila; caolho: tapa-olho
  const eye = ["#3a2a1a", "#2e4a6b", "#3d5a2e"][L.eyes ?? 0], big = id % 3 === 0 ? 3.4 : 2.8;
  const one = (x: number) => `<ellipse cx="${x}" cy="29" rx="${big}" ry="${big * 0.9}" fill="#fff" stroke="${INK}" stroke-width="1"/><circle cx="${x + 0.4}" cy="29.4" r="1.4" fill="${eye}"/>`;
  const eyes = one(26.5) + (c.traits.includes("Caolho") ? `<path d="M18 22 L45 31" stroke="${INK}" stroke-width="1.2"/><ellipse cx="37.5" cy="29" rx="3.6" ry="3" fill="${INK}"/>` : one(37.5));
  const angry = ["Implacável", "Agressivo", "Autoritário", "Impulsivo"].includes(p), proud = ["Arrogante", "Centralizador", "Vaidoso"].includes(p);
  const brows = angry ? `<path d="M22 23.5 L30 26 M42 23.5 L34 26" stroke="${hair}" stroke-width="2.2" stroke-linecap="round"/>`
    : proud ? `<path d="M22.5 24 Q26.5 20.5 30 23.5 M34 23.5 Q37.5 20.5 41.5 24" stroke="${hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
    : `<path d="M23 24.5 Q26.5 23 30 24.5 M34 24.5 Q37.5 23 41 24.5" stroke="${hair}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const nose = [`<path d="M32 30 L29.5 35 H33" stroke="${INK}" stroke-width="1.2" fill="none"/>`, `<path d="M31 29 Q37 35 31 36" stroke="${INK}" stroke-width="1.2" fill="${skin}"/>`,
    `<ellipse cx="32" cy="34.5" rx="3" ry="2.2" fill="${skin}" stroke="${INK}" stroke-width="1.1"/>`, `<path d="M32 29 Q30 34 32.5 35.5" stroke="${INK}" stroke-width="1.1" fill="none"/>`][id % 4];
  const smile = ["Inspirador", "Sociável", "Generoso", "Populista", "Humilde"].includes(p), sneer = ["Arrogante", "Manipulador", "Implacável"].includes(p);
  const mouth = smile ? `<path d="M27 38.5 Q32 43 37 38.5" stroke="#5a2a20" stroke-width="1.6" fill="#7a3a30"/>` : sneer ? `<path d="M27.5 40 Q33 38 37 39.5" stroke="#5a2a20" stroke-width="1.6" fill="none"/>` : `<path d="M28 40 H36" stroke="#5a2a20" stroke-width="1.5"/>`;
  // barba: nenhuma, bigode, cavanhaque, cheia, longa (traço)
  const beardKind = c.female ? 0 : c.traits.includes("Barba longa") ? 4 : L.beard ?? 0;
  const beard = ["", `<path d="M26 36.5 Q32 33.5 38 36.5 Q32 35.5 26 36.5Z" fill="${hair}" stroke="${hair}" stroke-width="2" stroke-linejoin="round"/>`,
    `<path d="M29 41 Q32 48 35 41Z" fill="${hair}" ${o}/>`, `<path d="M18 32 Q19 46 32 47 Q45 46 46 32 Q40 41 32 41 Q24 41 18 32Z" fill="${hair}" ${o}/>`,
    `<path d="M18 32 Q18 58 32 60 Q46 58 46 32 Q40 41 32 41 Q24 41 18 32Z" fill="${hair}" ${o}/>`][beardKind];
  const scar = L.scar || c.traits.includes("Cicatrizado") ? `<path d="M38 20 L43 33 M39.5 24 l2.5 -1 M41 28 l2.5 -1" stroke="#9a4a3a" stroke-width="1.3"/>` : "";
  const bg = c.exiledTo ? "#2a2a33" : "#2a2620";
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" style="background:${bg};border:1px solid #5a4d33${c.dead ? ";filter:grayscale(1)" : ""}" aria-hidden="true">` +
    `${body}${medals}<rect x="28" y="42" width="8" height="7" fill="${skin}" ${o}/>${ears}${head}${hairs}${eyes}${brows}${nose}${mouth}${beard}${scar}${hat(c, era, hair)}</svg>`;
}
