# DataStart

Blog statique basé sur [AstroWind](https://github.com/onwidget/astrowind) (Astro + Tailwind), déployé sur GitHub Pages.

## Prérequis

- Node.js ≥ 22.22.3 (version de référence dans `.nvmrc`, `nvm use` si besoin)
- npm

## Lancer en local

```bash
npm install
npm run dev      # http://localhost:4321
```

Ouvrir ensuite <http://localhost:4321> dans le navigateur : le terminal affiche seulement l'URL, pas de fenêtre qui s'ouvre.

Autres commandes :

```bash
npm run build    # sortie dans dist/
npm run preview  # sert dist/ en local (après build)
npm run check    # astro check + eslint + prettier
npm run fix      # corrige eslint + prettier
```

## Dépannage

- `Another astro dev server is already running` : un serveur tourne déjà (voir l'URL et le PID affichés). Soit l'utiliser, soit `npx astro dev stop`, soit `npx astro dev --force` pour le remplacer.
- Erreur au démarrage ou modules manquants : `rm -rf node_modules && npm install`.
- Port 4321 occupé par autre chose : `npm run dev -- --port 4322`.

## Contenu

Articles: `src/data/post/*.md|mdx`. Config: `src/config.yaml` (`site.site` = `https://datastart.fr`), navigation: `src/navigation.ts`.
