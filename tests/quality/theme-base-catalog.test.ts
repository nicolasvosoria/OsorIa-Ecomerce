import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { THEME_PRESETS } from "@/lib/theme-font/theme-presets";
import { THEME_COLOR_KEYS } from "@/lib/theme-font/runtime-contract";

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations");
const APP_THEMES_TUPLE = /\(\s*'([^']+)'\s*,\s*'([^']*)'::jsonb\s*,\s*(?:true|false)\s*\)/g;

function seededThemeColorsByName(): Record<string, unknown> {
  const insertStatements = readdirSync(MIGRATIONS_DIR)
    .filter((entry) => entry.endsWith(".sql"))
    .map((entry) => readFileSync(join(MIGRATIONS_DIR, entry), "utf8"))
    .join("\n")
    .match(/insert into ecommerce\.app_themes[\s\S]*?;/g) ?? [];

  const colorsByName: Record<string, unknown> = {};
  for (const statement of insertStatements) {
    for (const [, themeName, colorsJson] of statement.matchAll(APP_THEMES_TUPLE)) {
      colorsByName[themeName] = JSON.parse(colorsJson);
    }
  }

  return colorsByName;
}

describe("the base theme catalog is reproducible from the repo's own SQL", () => {
  const seededColors = seededThemeColorsByName();
  const presetNames = Object.keys(THEME_PRESETS);

  it.each(presetNames)("seeds an ecommerce.app_themes row for the %s preset", (presetName) => {
    expect(seededColors[presetName]).toBeDefined();
  });

  it.each(presetNames)(
    "gives the %s preset's seeded row all 10 ThemeColors keys",
    (presetName) => {
      const colors = seededColors[presetName] as Record<string, unknown> | undefined;

      for (const key of THEME_COLOR_KEYS) {
        expect(typeof colors?.[key]).toBe("string");
        expect((colors?.[key] as string | undefined)?.length).toBeGreaterThan(0);
      }
    },
  );
});
