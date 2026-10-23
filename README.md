# DataStart

Blog statique basé sur [AstroWind](https://github.com/onwidget/astrowind) (Astro + Tailwind), déployé sur GitHub Pages.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # sortie dans dist/
npm run check    # astro check + eslint + prettier
```

Articles: `src/data/post/*.md|mdx`. Config: `src/config.yaml` (`site.site` = `https://datastart.fr`), navigation: `src/navigation.ts`.
