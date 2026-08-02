import AnimatedBackground from '../components/AnimatedBackground';
import {
  AfterglowBackground,
  CathodeVectorscopeBackground,
  EmptyBackground,
  FieldBackground,
  GenerativeFlowBackground,
  HoloLaminateBackground,
  MilkdropBackground,
  RisographBackground,
  VellumHymnalBackground,
  WinampBackground,
} from './ThemeBackgrounds';

export const DEFAULT_THEME_ID = 'suprematist';

export const THEMES = [
  {
    id: 'suprematist',
    name: 'Suprematist',
    reference: 'Kazimir Malevich, Suprematist Painting (1916-17)',
    href: 'https://www.moma.org/collection/works/80387',
    className: 'theme-suprematist',
    Background: AnimatedBackground,
  },
  {
    id: 'facet',
    name: 'Facet',
    reference: 'Crisp geometric abstraction after the Facet MoMA prototype',
    href: 'https://www.moma.org/search/?query=geometric%20abstraction',
    className: 'theme-facet',
    Background: EmptyBackground,
  },
  {
    id: 'field',
    name: 'Field',
    reference: 'Villalba field study with a vertical cut and progress wedge',
    href: 'https://www.moma.org/search/?query=Villalba',
    className: 'theme-field',
    Background: FieldBackground,
  },
  {
    id: 'winamp',
    name: 'Winamp',
    reference: 'Winamp 2.x classic skin and fire spectrum analyzer',
    href: 'https://winamp.com/',
    className: 'theme-winamp',
    Background: WinampBackground,
  },
  {
    id: 'milkdrop',
    name: 'Milkdrop',
    reference: 'Ryan Geiss, Milkdrop 2 beat-clock visualizer',
    href: 'https://www.geisswerks.com/milkdrop/',
    className: 'theme-milkdrop',
    Background: MilkdropBackground,
  },
  {
    id: 'flow',
    name: 'Flow',
    reference: 'Processing-era generative flow fields by Reas, Fry, and peers',
    href: 'https://processing.org/',
    className: 'theme-flow',
    Background: GenerativeFlowBackground,
  },
  {
    id: 'risograph',
    name: 'Risograph',
    reference: 'Risograph zine and gig-poster print language',
    href: 'https://www.riso.co.jp/english/',
    className: 'theme-risograph',
    Background: RisographBackground,
  },
  {
    id: 'afterglow',
    name: 'Afterglow',
    reference: '032c, cinematic dark editorial typography and chromatic bloom',
    href: 'https://032c.com/',
    className: 'theme-afterglow',
    Background: AfterglowBackground,
  },
  {
    id: 'cathode-vectorscope',
    name: 'Cathode',
    reference: 'Jerobeam Fenderson, Oscilloscope Music on Tektronix D11 5103N',
    href: 'https://oscilloscopemusic.com/watch/oscilloscope_music',
    className: 'theme-cathode',
    Background: CathodeVectorscopeBackground,
  },
  {
    id: 'vellum-hymnal',
    name: 'Vellum',
    reference: 'Book of Kells illuminated manuscript and Winchester Bible rubrication',
    href: 'https://digitalcollections.tcd.ie/collections/ks65hc20t?locale=en',
    className: 'theme-vellum',
    Background: VellumHymnalBackground,
  },
  {
    id: 'holo-laminate-pass',
    name: 'Laminate',
    reference: 'Holopasses holographic backstage laminates and tour credentials',
    href: 'https://holopasses.com/en/collections/backstagepasslaminateholo',
    className: 'theme-holo',
    Background: HoloLaminateBackground,
  },
];

const themeById = new Map(THEMES.map((theme) => [theme.id, theme]));

export function getThemeById(themeId) {
  return themeById.get(themeId) || themeById.get(DEFAULT_THEME_ID);
}

export function getRandomThemeId() {
  return THEMES[Math.floor(Math.random() * THEMES.length)]?.id || DEFAULT_THEME_ID;
}

export function getNextThemeId(themeId) {
  const index = THEMES.findIndex((theme) => theme.id === themeId);
  const nextIndex = index >= 0 ? (index + 1) % THEMES.length : 0;
  return THEMES[nextIndex]?.id || DEFAULT_THEME_ID;
}
