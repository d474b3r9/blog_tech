# Contexte du projet

Lire la section « Circuit de publication » du README avant de travailler sur les articles ou le déploiement.

- Jonathan prépare et relit les articles dans `d474b3r9/blog_tech_private`, la source de vérité. Faire les modifications dans ce dépôt.
- Montrer les articles sur le site local pour la relecture.
- Le workflow `.github/workflows/sync-public.yml` synchronise depuis `main` les articles prêts vers `d474b3r9/blog_tech`. Il retient les articles dont `draft` n’est pas `true` et dont le jour de publication est arrivé, selon l’heure de Paris.
- Le dépôt public `blog_tech` déploie ensuite le site sur GitHub Pages, à l’adresse `https://datastart.fr`, via `.github/workflows/deploy.yml`.
- Pour publier, suivre ce circuit depuis le dépôt privé. Une demande d’aperçu local autorise le lancement du serveur et l’ouverture du navigateur ; elle ne demande pas une publication.

## Contrôles d’indexation

Pour tout nouvel article ou changement SEO, appliquer aussi `~/.agents/skills/article-illustrations/references/publication-seo.md`.

- Avant publication, lancer `npm run build`, `npm run check:seo` et `npm run check:links`. Corriger les erreurs avant de poursuivre. Les workflows exécutent ces contrôles sur le site à publier.
- Conserver les URL des articles déjà publiés. Un changement de slug exige de vérifier le traitement de l'ancienne URL et les liens entrants connus.
- Après déploiement, vérifier l'URL finale en ligne : HTTP 200 sans redirection, absence de `noindex`, canonical et présence dans le sitemap. Ne pas confondre un contrôle local avec un contrôle du site déployé.
- Un statut « explorée, actuellement non indexée » ne prouve pas un défaut technique. Examiner l'URL et la date d'exploration avant de modifier le contenu ou les directives.

- Conserver le CV indexable et présent dans le sitemap. Les archives de tags restent en `noindex, follow`, hors sitemap.
