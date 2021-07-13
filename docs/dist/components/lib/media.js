import watchMedia from "svelte-media";
const mediaqueries = {
  sm: "(min-width: 48em)",
  md: "(min-width: 62em)",
  lg: "(min-width: 75em)",
  landscape: "(orientation: landscape)",
  portrait: "(orientation: portrait)",
  dark: "(prefers-color-scheme: dark)",
  light: "(prefers-color-scheme: light)",
  noanimations: "(prefers-reduced-motion: reduce)"
};
const media = watchMedia(mediaqueries);
export default media;
