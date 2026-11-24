// Ícones de linha, todos no mesmo estilo (traço 1.6, cor do texto). Usados no lugar de emojis na interface.
const P: Record<string, string> = {
  overview: "M3 4h18v16H3z M3 9h18 M9 9v11",
  people: "M9 8a3 3 0 1 0 0-.01 M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M17 7a2.5 2.5 0 1 0 0-.01 M16 14c2.8 0 5 2.2 5 5",
  economy: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  build: "M3 21h18 M5 21V11l7-5 7 5v10 M10 21v-5h4v5",
  trade: "M4 8h13l-3-3 M20 16H7l3 3",
  diplomacy: "M2 12l5-5 4 3 4-3 5 5-6 6-3-2-3 2z",
  politics: "M3 21h18 M5 21V10 M9.7 21V10 M14.3 21V10 M19 21V10 M2 10l10-6 10 6z",
  tech: "M9 21h6 M10 17h4 M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z",
  military: "M4 20L18 6 M15 4l5 5 M4 16l4 4 M14 20L5 11 M9 4L4 9 M10 20l-6-6",
  admin: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7",
  society: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z",
  charts: "M3 3v18h18 M7 15l4-5 3 3 5-7",
  treasury: "M4 9h16v10H4z M4 9l8-5 8 5 M12 12v4",
  prestige: "M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.5-4 6-.6z",
  stability: "M12 3v18 M4 8h16 M6 8l-3 7h6z M18 8l-3 7h6z",
  legitimacy: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z M8.5 12l2.5 2.5 4.5-5",
  pause: "M8 5v14 M16 5v14",
  play: "M7 4l13 8-13 8z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 21h4",
  save: "M5 3h11l3 3v15H5z M8 3v6h8V3 M8 14h8v7H8z",
  load: "M3 7h6l2 2h10v11H3z",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18",
  newmap: "M4 4h16v16H4z M4 12h16 M12 4v16",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5 M12 17v.5",
  close: "M6 6l12 12 M18 6L6 18",
};

/** SVG inline de um ícone pelo nome (tamanho em px). */
export const icon = (name: keyof typeof P | string, size = 16) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] ?? P.overview}"/></svg>`;
