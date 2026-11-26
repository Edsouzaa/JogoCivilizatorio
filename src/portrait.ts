// Retrato simples gerado pelas características do personagem: rosto, pele, cabelo, barba, cicatriz, corpo e roupa
// (a roupa muda com a era). SVG pequeno, sem imagens externas.
import type { Character } from "./characters.ts";

const SKIN = ["#f1d2b6", "#dcb08a", "#b98559", "#8a5a36", "#5e3b22"];
const HAIR = ["#1e1a17", "#4a3220", "#8a5a2b", "#c9a15a", "#a9a39b"];
// roupa por era: tribal (pele/couro), clássica (toga), medieval, renascença, descobertas, revoluções, industrial, guerras, multipolar, moderna
const CLOTH = ["#7a5a3a", "#d8d0bd", "#5b3a5e", "#7a2e2e", "#2e4a6b", "#2f3a5a", "#2b2b2b", "#4a5a3a", "#3a3f4a", "#2a3550"];

export function portraitSVG(c: Character, era: number, size = 64) {
  const L = c.looks, skin = SKIN[L.skin], hair = HAIR[c.dead || c.traits.includes("Cabelos grisalhos") ? 4 : L.hair], cloth = CLOTH[Math.min(era, CLOTH.length - 1)];
  // corpo: 0 quadrado, 1 ampulheta, 2 triângulo
  const body = [
    `<path d="M14 64 V52 Q14 44 22 43 H42 Q50 44 50 52 V64Z" fill="${cloth}"/>`,
    `<path d="M16 64 Q20 52 24 48 Q32 44 40 48 Q44 52 48 64Z" fill="${cloth}"/>`,
    `<path d="M10 64 L22 44 H42 L54 64Z" fill="${cloth}"/>`,
  ][L.body];
  // rosto: 0 redondo, 1 quadrado, 2 oval
  const head = [`<circle cx="32" cy="28" r="12" fill="${skin}"/>`, `<rect x="20" y="16" width="24" height="25" rx="5" fill="${skin}"/>`, `<ellipse cx="32" cy="28" rx="10.5" ry="13.5" fill="${skin}"/>`][L.face];
  // cabelo: 0 curto, 1 comprido, 2 careca, 3 coque
  const hairs = [
    `<path d="M20 25 Q20 13 32 13 Q44 13 44 25 Q40 18 32 18 Q24 18 20 25Z" fill="${hair}"/>`,
    `<path d="M19 40 Q16 14 32 13 Q48 14 45 40 L42 40 Q43 20 32 19 Q21 20 22 40Z" fill="${hair}"/>`,
    `<path d="M22 21 Q32 14 42 21" stroke="${hair}" stroke-width="2" fill="none"/>`,
    `<path d="M20 25 Q20 14 32 14 Q44 14 44 25 Q40 19 32 19 Q24 19 20 25Z" fill="${hair}"/><circle cx="32" cy="11" r="4" fill="${hair}"/>`,
  ][L.hairStyle];
  // barba: 0 nenhuma, 1 bigode, 2 cavanhaque, 3 cheia
  const beard = ["", `<path d="M26 34 Q32 31 38 34" stroke="${hair}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    `<path d="M29 37 Q32 44 35 37Z" fill="${hair}"/>`, `<path d="M21 31 Q22 44 32 45 Q42 44 43 31 Q38 38 32 38 Q26 38 21 31Z" fill="${hair}"/>`][L.beard];
  const eye = ["#3a2a1a", "#2e4a6b", "#3d5a2e"][L.eyes];
  const oneEye = c.traits.includes("Caolho");
  const eyes = `<circle cx="27.5" cy="28" r="1.4" fill="${eye}"/>` + (oneEye ? `<path d="M33 26.5 h7 M20 22 L40 27" stroke="#1a1410" stroke-width="1.2"/><ellipse cx="36.5" cy="28" rx="3" ry="2.3" fill="#1a1410"/>` : `<circle cx="36.5" cy="28" r="1.4" fill="${eye}"/>`);
  // sobrancelhas pela personalidade: bravas, erguidas (arrogante) ou suaves; nariz pelo id (sem dois iguais em sequência)
  const p = c.personality ?? "", angry = ["Implacável", "Agressivo", "Autoritário", "Impulsivo"].includes(p), proud = ["Arrogante", "Centralizador"].includes(p);
  const brows = angry ? `<path d="M24.5 24.5 L30 26 M39.5 24.5 L34 26" stroke="${hair}" stroke-width="1.4" stroke-linecap="round"/>` : proud ? `<path d="M24.5 24 Q27.5 22 30 24 M34 24 Q36.5 22 39.5 24" stroke="${hair}" stroke-width="1.2" fill="none"/>` : `<path d="M25 25 Q27.5 24 30 25 M34 25 Q36.5 24 39 25" stroke="${hair}" stroke-width="1.1" fill="none"/>`;
  const nose = [`<path d="M32 29 L30.5 33 H33" stroke="#00000055" fill="none"/>`, `<path d="M32 28 Q35 33 31 34" stroke="#00000055" fill="none"/>`, `<ellipse cx="32" cy="32.5" rx="2" ry="1.4" fill="#00000022"/>`][c.id % 3];
  const mouth = ["Inspirador", "Sociável", "Generoso", "Populista"].includes(p) ? `<path d="M28.5 36 Q32 39 35.5 36" stroke="#5a2a20" stroke-width="1.1" fill="none"/>` : `<path d="M29 37 H35" stroke="#5a2a20" stroke-width="1"/>`;
  const scar = L.scar ? `<path d="M36 22 L40 30" stroke="#9a5a4a" stroke-width="1.2"/>` : "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" style="background:#2a2620;border:1px solid #5a4d33${c.dead ? ";filter:grayscale(1)" : ""}" aria-hidden="true">${body}<rect x="28" y="38" width="8" height="7" fill="${skin}"/>${head}${hairs}${eyes}${brows}${nose}${mouth}${beard}${scar}</svg>`;
}
