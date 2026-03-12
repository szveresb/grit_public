/**
 * Calculate moon phase for a given date using the synodic month algorithm.
 * Returns a phase index 0-7 and corresponding emoji.
 */

const SYNODIC_MONTH = 29.53058770576;
const KNOWN_NEW_MOON = new Date(2000, 0, 6, 18, 14).getTime(); // Jan 6, 2000

export type MoonPhase = {
  index: number; // 0-7
  emoji: string;
  nameEn: string;
  nameHu: string;
};

const PHASES: Omit<MoonPhase, 'index'>[] = [
  { emoji: '🌑', nameEn: 'New Moon', nameHu: 'Újhold' },
  { emoji: '🌒', nameEn: 'Waxing Crescent', nameHu: 'Növekvő sarló' },
  { emoji: '🌓', nameEn: 'First Quarter', nameHu: 'Első negyed' },
  { emoji: '🌔', nameEn: 'Waxing Gibbous', nameHu: 'Növekvő hold' },
  { emoji: '🌕', nameEn: 'Full Moon', nameHu: 'Telihold' },
  { emoji: '🌖', nameEn: 'Waning Gibbous', nameHu: 'Fogyó hold' },
  { emoji: '🌗', nameEn: 'Last Quarter', nameHu: 'Utolsó negyed' },
  { emoji: '🌘', nameEn: 'Waning Crescent', nameHu: 'Fogyó sarló' },
];

export function getMoonPhase(date: Date): MoonPhase {
  const diff = date.getTime() - KNOWN_NEW_MOON;
  const days = diff / (1000 * 60 * 60 * 24);
  const cycles = days / SYNODIC_MONTH;
  const fraction = cycles - Math.floor(cycles);
  const index = Math.round(fraction * 8) % 8;
  return { index, ...PHASES[index] };
}
