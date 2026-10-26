# Jiaqi Yu — Personal homepage

A static homepage with a persistent Möbius ribbon rendered by Three.js.
Serve this directory with any static HTTP server and open `index.html`.
No build step or external CDN connection is required.

## Experience

The page follows About → Action → Vision → Language → Contact. The background
stays in the viewport while text scrolls normally. GSAP and ScrollTrigger ease
between chapter visual states: a moving trajectory for Action,
a transverse grid for Vision, and connected nodes for Language. The ribbon has
one half-twist; its off-centre strands close after two turns.

`mobius.css` contains the responsive layout. `mobius.js` owns the geometry,
chapter selection, scroll transitions and rendering. The animation pauses when
the tab is hidden. The ribbon rotates slowly around one fixed tilted axis; scroll adds a continuous
turn without changing axes at chapter boundaries. Reduced-motion mode keeps a static
ribbon. If WebGL cannot initialize, a decorative SVG remains and all page content
and links are available. The background never captures pointer/touch scrolling.

The earlier mountain prototype remains available at `mountain-play.html`.

## Bundled dependencies

- Three.js 0.180.0: `assets/vendor/three.module.js` and `three.core.js`.
  MIT license: `assets/vendor/THREE-LICENSE.txt`.
- GSAP and ScrollTrigger 3.13.0: `assets/vendor/`. Original license headers retained.
  License: https://gsap.com/standard-license/
- Work Sans and Playfair Display fonts with OFL licenses: `assets/fonts/`.
