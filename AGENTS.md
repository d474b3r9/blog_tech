# Contexte du projet

Lire la section « Circuit de publication » du README avant de travailler sur les articles ou le déploiement.

- Jonathan prépare et relit les articles dans `d474b3r9/blog_tech_private`, la source de vérité. Faire les modifications dans ce dépôt.
- Montrer les articles sur le site local pour la relecture.
- Le workflow `.github/workflows/sync-public.yml` synchronise depuis `main` les articles prêts vers `d474b3r9/blog_tech`. Il retient les articles dont `draft` n’est pas `true` et dont le jour de publication est arrivé, selon l’heure de Paris.
- Le dépôt public `blog_tech` déploie ensuite le site sur GitHub Pages, à l’adresse `https://datastart.fr`, via `.github/workflows/deploy.yml`.
- Pour publier, suivre ce circuit depuis le dépôt privé. Une demande d’aperçu local autorise le lancement du serveur et l’ouverture du navigateur ; elle ne demande pas une publication.
