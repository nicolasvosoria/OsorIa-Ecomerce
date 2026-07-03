import {
  DEFAULT_RUNTIME_THEME,
  type RuntimeTheme,
} from "@/lib/theme-font/runtime-contract";

export const CRITICAL_THEME_CSS_VARIABLES = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--muted",
  "--muted-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--accent",
  "--accent-foreground",
  "--popover",
  "--popover-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
] as const;

export type ThemeCssVariable = (typeof CRITICAL_THEME_CSS_VARIABLES)[number];
export type ThemeCssVariableMap = Record<ThemeCssVariable, string>;

export const CRITICAL_THEME_CONTRAST_PAIRS = [
  ["background/foreground", "--background", "--foreground"],
  ["card/card-foreground", "--card", "--card-foreground"],
  ["muted/muted-foreground", "--muted", "--muted-foreground"],
  ["popover/popover-foreground", "--popover", "--popover-foreground"],
  ["primary/primary-foreground", "--primary", "--primary-foreground"],
  ["secondary/secondary-foreground", "--secondary", "--secondary-foreground"],
  ["accent/accent-foreground", "--accent", "--accent-foreground"],
  ["destructive/destructive-foreground", "--destructive", "--destructive-foreground"],
].map(([name, background, foreground]) => ({
  name,
  background: background as ThemeCssVariable,
  foreground: foreground as ThemeCssVariable,
}));

function createThemeContrastResolver(defaultTheme: RuntimeTheme) {
  const names = [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--muted",
    "--muted-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--accent",
    "--accent-foreground",
    "--popover",
    "--popover-foreground",
    "--destructive",
    "--destructive-foreground",
    "--border",
  ];
  const minimum = 4.5;
  const light = "#ffffff";
  const dark = "#111111";
  const destructive = "#dc2626";

  function normalize(value: string | null | undefined, fallback: string) {
    if (typeof value !== "string") return fallback;
    const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());
    if (!match) return fallback;
    const hex = match[1].toLowerCase();
    return `#${hex.length === 3 ? hex.replace(/./g, "$&$&") : hex}`;
  }

  function luminance(color: string) {
    const hex = normalize(color, dark).slice(1);
    const channels = [0, 2, 4].map((start) => {
      const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
      return channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrast(background: string, foreground: string) {
    const ratios = [luminance(background), luminance(foreground)].sort(
      (a, b) => b - a,
    );
    return (ratios[0] + 0.05) / (ratios[1] + 0.05);
  }

  function foreground(background: string, preferred: string) {
    if (contrast(background, preferred) >= minimum) return preferred;
    return contrast(background, light) >= contrast(background, dark)
      ? light
      : dark;
  }

  function resolve(theme: RuntimeTheme) {
    const defaults = defaultTheme.colors;
    const colors = theme && theme.colors ? theme.colors : defaults;
    const background = normalize(colors.background, defaults.background);
    const baseForeground = foreground(
      background,
      normalize(colors.foreground, defaults.foreground),
    );
    const card = normalize(colors.card, defaults.card);
    const cardForeground = foreground(
      card,
      normalize(colors.cardForeground, defaults.cardForeground),
    );
    const muted = normalize(colors.muted, defaults.muted);
    const primary = normalize(colors.primary, defaults.primary);
    const secondary = normalize(colors.secondary, defaults.secondary);
    const accent = normalize(colors.accent, defaults.accent);

    return {
      "--background": background,
      "--foreground": baseForeground,
      "--card": card,
      "--card-foreground": cardForeground,
      "--muted": muted,
      "--muted-foreground": foreground(
        muted,
        normalize(colors.mutedForeground, defaults.mutedForeground),
      ),
      "--primary": primary,
      "--primary-foreground": foreground(primary, baseForeground),
      "--secondary": secondary,
      "--secondary-foreground": foreground(secondary, baseForeground),
      "--accent": accent,
      "--accent-foreground": foreground(accent, baseForeground),
      "--popover": card,
      "--popover-foreground": cardForeground,
      "--destructive": destructive,
      "--destructive-foreground": foreground(destructive, light),
      "--border": normalize(colors.border, defaults.border),
    };
  }

  return { contrast, names, resolve };
}

const resolver = createThemeContrastResolver(DEFAULT_RUNTIME_THEME);

export function getContrastRatio(background: string, foreground: string): number {
  return resolver.contrast(background, foreground);
}

export function resolveThemeCssVariables(theme: RuntimeTheme): ThemeCssVariableMap {
  return resolver.resolve(theme) as ThemeCssVariableMap;
}

export const THEME_CONTRAST_HELPER_SOURCE = `
    const themeContrastResolver = (${createThemeContrastResolver.toString()})(defaultTheme);
    const CRITICAL_THEME_CSS_VARIABLES = themeContrastResolver.names;
    const resolveThemeCssVariables = themeContrastResolver.resolve;
`;
