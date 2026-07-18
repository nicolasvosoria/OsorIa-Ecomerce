'use client';

import { useQueryState, parseAsArrayOf, parseAsString } from 'nuqs';
import { Product } from '@/lib/commerce/types';
import { Color } from '@/components/ui/color-picker';
import { COLOR_MAP } from '@/lib/constants';
import { useEffect, useMemo } from 'react';

// key = raw value used for variant matching and URL state (kept as-is so filtering
// keeps working); label = Spanish name rendered in the swatch and its aria-label.
const COLOR_LABELS_ES: Record<string, string> = {
  olive: 'Oliva',
  beige: 'Beige',
  white: 'Blanco',
  blue: 'Azul',
  brown: 'Marrón',
  sand: 'Arena',
  green: 'Verde',
  black: 'Negro',
  orange: 'Naranja',
  'dark brown': 'Marrón oscuro',
  pink: 'Rosa',
  red: 'Rojo',
  yellow: 'Amarillo',
  purple: 'Morado',
  gray: 'Gris',
  grey: 'Gris',
  gold: 'Dorado',
  silver: 'Plateado',
  'army green': 'Verde militar',
  'navy blue': 'Azul marino',
  navy: 'Azul marino',
  coral: 'Coral',
  salmon: 'Salmón',
  khaki: 'Caqui',
  plum: 'Ciruela',
  tan: 'Tostado',
  crimson: 'Carmesí',
  turquoise: 'Turquesa',
  lavender: 'Lavanda',
  ivory: 'Marfil',
  mint: 'Menta',
  peach: 'Durazno',
  pistachio: 'Pistacho',
  cream: 'Crema',
  wood: 'Madera',
};

function toColorLabel(key: string): string {
  return COLOR_LABELS_ES[key.toLowerCase()] ?? titleCase(key);
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

const baseColors: { key: string; value: string }[] = [
  { key: 'Olive', value: COLOR_MAP['olive'] },
  { key: 'Beige', value: COLOR_MAP['beige'] },
  { key: 'White', value: COLOR_MAP['white'] },
  { key: 'Blue', value: COLOR_MAP['blue'] },
  { key: 'Brown', value: COLOR_MAP['brown'] },
  { key: 'Sand', value: COLOR_MAP['sand'] },
  { key: 'Green', value: COLOR_MAP['green'] },
  { key: 'Black', value: COLOR_MAP['black'] },
  { key: 'Orange', value: COLOR_MAP['orange'] },
  { key: 'Dark Brown', value: COLOR_MAP['dark-brown'] },
  { key: 'Pink', value: COLOR_MAP['pink'] },
  { key: 'Red', value: COLOR_MAP['red'] },
  { key: 'Yellow', value: COLOR_MAP['yellow'] },
  { key: 'Purple', value: COLOR_MAP['purple'] },
  { key: 'Gray', value: COLOR_MAP['gray'] },
  { key: 'Gold', value: COLOR_MAP['gold'] },
  { key: 'Silver', value: COLOR_MAP['silver'] },
  { key: 'Army Green', value: COLOR_MAP['army-green'] },
  { key: 'Navy Blue', value: COLOR_MAP['navy-blue'] },
  { key: 'Navy', value: COLOR_MAP['navy'] },
  { key: 'Coral', value: COLOR_MAP['coral'] },
  { key: 'Salmon', value: COLOR_MAP['salmon'] },
  { key: 'Khaki', value: COLOR_MAP['khaki'] },
  { key: 'Plum', value: COLOR_MAP['plum'] },
  { key: 'Tan', value: COLOR_MAP['tan'] },
  { key: 'Crimson', value: COLOR_MAP['crimson'] },
  { key: 'Turquoise', value: COLOR_MAP['turquoise'] },
  { key: 'Lavender', value: COLOR_MAP['lavender'] },
  { key: 'Ivory', value: COLOR_MAP['ivory'] },
  { key: 'Mint', value: COLOR_MAP['mint'] },
  { key: 'Peach', value: COLOR_MAP['peach'] },
  { key: 'Pistachio', value: COLOR_MAP['pistachio'] },
  { key: 'Cream', value: COLOR_MAP['cream'] },
  { key: 'Wood', value: COLOR_MAP['wood'] },
];

const allColors: Color[] = baseColors.map((color) => ({
  key: color.key,
  label: toColorLabel(color.key),
  value: color.value,
}));

const getColorKey = (color: Color | [Color, Color]) => {
  if (Array.isArray(color)) {
    const [first, second] = color;
    return `${first.key}/${second.key}`;
  }
  return color.key;
};

export function useAvailableColors(products: Product[]) {
  const [color, setColor] = useQueryState('fcolor', parseAsArrayOf(parseAsString).withDefault([]));

  // Extract available color keys from products using memoization
  const availableColorKeys = useMemo(() => {
    const colorSet = new Set<string>();

    products.forEach(product => {
      const colorOption = product.options.find(option => option.name.toLowerCase() === 'color');

      if (colorOption) {
        colorOption.values.forEach((value: any) => {
          // Handle both formats: SFCC reshaped format {id, name} and raw string format
          let colorName: string;
          if (typeof value === 'string') {
            // Raw string format
            colorName = value.toLowerCase();
          } else if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') {
            // SFCC reshaped format
            colorName = value.name.toLowerCase();
          } else {
            return; // Skip invalid values
          }

          const matchingColor = allColors.find(c => c.key.toLowerCase() === colorName);
          if (matchingColor) {
            colorSet.add(matchingColor.key);
          }
        });
      }
    });

    return colorSet;
  }, [products]);

  // Filter to only show available colors
  const availableColors = allColors.filter(c => availableColorKeys.has(c.key));

  // Auto-remove unavailable color filters
  useEffect(() => {
    if (color.length > 0) {
      const validColors = color.filter(colorKey => availableColorKeys.has(colorKey));

      if (validColors.length !== color.length) {
        setColor(validColors);
      }
    }
  }, [products, color, setColor, availableColorKeys]);

  const toggleColor = (colorInput: Color | [Color, Color]) => {
    const colorKey = getColorKey(colorInput);
    setColor(color.includes(colorKey) ? color.filter(c => c !== colorKey) : [...color, colorKey]);
  };

  const selectedColors = availableColors.filter(c => color.includes(c.key));

  return {
    availableColors,
    selectedColors,
    toggleColor,
    activeColorFilters: color,
  };
}
