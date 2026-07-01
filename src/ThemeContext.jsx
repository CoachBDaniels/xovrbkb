import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { COLORS as STATIC_COLORS } from './theme';

// Live theme state shared across the whole app. Starts with the static fallback
// colors from theme.js, then gets overwritten with whatever's saved in
// theme_settings once a team is selected. refreshTheme() re-fetches on demand
// so the Save button in ThemeSettingsScreen can push live updates everywhere
// without needing a full page reload.

const ThemeContext = createContext({
  colors: STATIC_COLORS,
  logo: null,
  homeLogo: null,
  homeLogoSize: 96,
  homeBg: null,
  teamName: 'Briarwood Lions',
  abbr: 'BCS',
  court: '#c8922a',
  lane: '#a06414',
  refreshTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function mergeColors(saved) {
  if (!saved) return STATIC_COLORS;
  return {
    ...STATIC_COLORS,
    navy: saved.navy || STATIC_COLORS.navy,
    navyDark: saved.navyDark || STATIC_COLORS.navyDark,
    navyMid: saved.navyMid || STATIC_COLORS.navyMid,
    border: saved.border || STATIC_COLORS.border,
    gold: saved.gold || STATIC_COLORS.gold,
    text: saved.text || STATIC_COLORS.text,
    muted: saved.muted || STATIC_COLORS.muted,
    green: saved.green || STATIC_COLORS.green,
    red: saved.red || STATIC_COLORS.red,
    goldLight: saved.goldLight || STATIC_COLORS.goldLight,
    statPosBg: saved.statPosBg || STATIC_COLORS.statPosBg,
    statPosBorder: saved.statPosBorder || STATIC_COLORS.statPosBorder,
    statPosText: saved.statPosText || STATIC_COLORS.statPosText,
    statNegBg: saved.statNegBg || STATIC_COLORS.statNegBg,
    statNegBorder: saved.statNegBorder || STATIC_COLORS.statNegBorder,
    statNegText: saved.statNegText || STATIC_COLORS.statNegText,
    playerBtnBg: saved.playerBtnBg || STATIC_COLORS.playerBtnBg,
    playerBtnText: saved.playerBtnText || STATIC_COLORS.playerBtnText,
    redBg: STATIC_COLORS.redBg,
    greenBg: STATIC_COLORS.greenBg,
    textDark: STATIC_COLORS.textDark,
  };
}

export function ThemeProvider({ teamId, children }) {
  const [state, setState] = useState({
    colors: STATIC_COLORS,
    logo: null,
    homeLogo: null,
    homeLogoSize: 96,
    homeBg: null,
    teamName: 'Briarwood Lions',
    abbr: 'BCS',
    court: '#c8922a',
    lane: '#a06414',
  });

  const refreshTheme = useCallback(async () => {
    if (!teamId) return;
    const { data: teamRow } = await supabase.from('teams').select('organization_id').eq('id', teamId).single();
    if (!teamRow?.organization_id) return;
    const { data: themeRow } = await supabase.from('theme_settings').select('theme').eq('organization_id', teamRow.organization_id).maybeSingle();
    const saved = themeRow?.theme;
    if (!saved) return;
    setState({
      colors: mergeColors(saved),
      logo: saved.logo || null,
      homeLogo: saved.homeLogo || null,
      homeLogoSize: saved.homeLogoSize || 96,
      homeBg: saved.homeBg || null,
      teamName: saved.teamName || 'Briarwood Lions',
      abbr: saved.abbr || 'BCS',
      court: saved.court || '#c8922a',
      lane: saved.lane || '#a06414',
    });
  }, [teamId]);

  useEffect(() => { refreshTheme(); }, [refreshTheme]);

  return (
    <ThemeContext.Provider value={{ ...state, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}