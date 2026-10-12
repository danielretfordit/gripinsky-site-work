/** Original academy figurines, not portfolio or student-work imagery. */
const themes: Record<string, string> = {
  baza:'interior', interiorpro:'interior', interiorpro_mini:'interior', vizualization3:'dollhouse', vizualization3_mini:'dollhouse', 'v-ray':'vray-original', archvizpro:'interior',
  exteriorpro:'exterior', residential_complex:'residential', materialspro:'materials', marvelous:'marvelous',
  gamedevlevel1:'gamedev', gamedevlevel2:'palm-original', demo_gamedev:'gamedev',
  blender:'blender', blender_mini:'blender', unrealenginelevel1:'unreal', ue_mini:'unreal',
  zbrush0:'zbrush', zbrushportret:'portrait-head', stylized_character:'pirate-original',
  speedtree:'tree', 'forest-railclone':'forest', epc:'forest',
  substancepainter:'substance-aligned', azbukaps:'photoshop', photoshoppro:'photoshop',
  art_pro:'art', artrender:'art', ai:'ai-original', 'ai-lab':'ai-original',
  modeling1:'book', modeling2:'furniture', '3dstock':'stock-original', maya_level1:'maya-original',
  uslugi_ind:'mentor', paket_ind5:'mentor', paket_ind10:'mentor', uslugi_nastavnik:'mentor', uslugi_skp:'mentor', uslugi_portfolio:'portfolio',
};
export function courseFigurine(id: string) {
  const theme = themes[id];
  if (!theme) return undefined;
  if (theme === 'marvelous') return { clay: '/images/figurines/marvelous-color-fit.webp', color: '/images/figurines/marvelous-color-fit.webp' };
  const root = `/images/figurines/${theme}`;
  const suffix = theme === 'tree' ? '-normalized' : '';
  return { clay: `${root}-clay-fit${suffix}.webp`, color: `${root}-color${theme === 'interior' ? '-v2' : ''}-fit${suffix}.webp` };
}
