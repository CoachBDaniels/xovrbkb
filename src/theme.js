// Shared theme constants for the Briarwood Lions app - colors used across every
// screen so the look stays consistent and only needs to change in one place.
// Matches the navy/gold/white identity from the original Claude artifact.
// (Logo to be added back separately - the long image data kept breaking on paste.)

export const COLORS = {
  navy: '#1a3a6b',      // primary brand color — headers, buttons, dark surfaces
  navyDark: '#0d1b2e',  // page background, deepest surface
  navyMid: '#162d50',   // cards, secondary surfaces
  gold: '#c8a84b',      // accent color — primary buttons, highlights, borders
  goldLight: '#fff7e6', // light gold background for selected/active states
  border: '#243d6b',    // subtle borders against navy
  text: '#e8edf5',      // primary text on dark backgrounds
  textDark: '#1a1a1a',  // primary text on light backgrounds
  muted: '#8a99b8',     // secondary/de-emphasized text
  green: '#15803d',     // positive values (made shots, positive efficiency)
  red: '#b91c1c',       // negative values (missed shots, negative efficiency, delete actions)
  greenBg: 'rgba(74,222,128,0.18)',
  redBg: 'rgba(239,68,68,0.18)',
  statPosBg: '#1e4d2e',
  statPosBorder: '#15803d',
  statPosText: '#15803d',
  statNegBg: '#4d1e1e',
  statNegBorder: '#b91c1c',
  statNegText: '#b91c1c',
  playerBtnBg: '#162d50',
  playerBtnText: '#e8edf5',
};