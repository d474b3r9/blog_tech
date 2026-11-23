---
title: 'Votre fichier AGENTS.md aide-t-il vos agents ?'
excerpt: 'Deux études ont comparé les correctifs produits avec et sans consignes dans le dépôt. Quels tickets les agents résolvent-ils, avec quel modèle et à quel coût ?'
publishDate: 2026-11-23T03:00:00Z
draft: false
image: ~/assets/images/votre-fichier-agents-md-aide-t-il-vos-agents/agents-md.png
imageAlt: 'Essais réussis sans puis avec consignes : Claude Code passe de 24 à 25 sur 45, Codex CLI de 30 à 29 sur 51.'
category: Data
tags: [agents, data-engineering, context-engineering]
author: Jonathan Cattelain
---

<div class="tldr">

- Sur 138 tickets, les chercheurs de CTXbench mesurent un surcoût moyen de 23 % avec les consignes générées.
- Dans une seconde étude, trois essais par ticket ne suffisent pas à mettre en évidence un écart de réussite entre les conditions étudiées.
- Les chercheurs évaluent les correctifs avec des tests. Un doublon comme celui que j’ai repéré en revue peut leur échapper.

</div>

En relisant un plan, j’ai vu que l’agent voulait recréer un connecteur qu’il avait déjà dans son contexte. Je lui ai indiqué lequel reprendre avant qu’il commence à coder. Dans [l’article sur les MD engineers](/des-yaml-engineers-aux-md-engineers/), j’envisageais d’écrire la règle de réutilisation dans le dépôt. Est-ce qu’il aurait trouvé le connecteur si j’avais ajouté cette ligne à mon `AGENTS.md` ? Je n’ai gardé de cet épisode qu’une revue de plan. Pour savoir ce qu’on a déjà mesuré, je suis revenu à deux études qui donnent leurs tickets, leurs critères de réussite et leurs résultats.

## CTXbench : le correctif doit passer les tests du ticket

Thibaud Gloaguen et ses coauteurs ont retenu 138 tâches issues de 12 dépôts. Pour chaque tâche, ils comparent trois conditions : retirer le fichier de consignes, garder celui des développeurs ou en faire générer un par un modèle. L’agent reçoit le ticket et propose une modification du code. Les chercheurs comptent le ticket comme résolu si le correctif passe tous les tests prévus pour cette tâche. [Protocole de CTXbench, sections 3 et 4](https://arxiv.org/html/2602.11988v2#S4.SS1)

Sur CTXbench, les chercheurs trouvent une différence de taux de résolution entre les consignes des développeurs et les consignes générées (_p_ = 0,038, test bilatéral de Cochran-Mantel-Haenszel), en faveur des premières. Quand ils comparent les consignes des développeurs à l’absence de fichier, l’écart ne franchit plus le seuil de 5 % (_p_ = 0,21). Si vous hésitez entre conserver le fichier de votre équipe et le supprimer, c’est cette deuxième comparaison qui répond à votre question. Les chercheurs mesurent aussi, avec le fichier généré, un coût moyen d’inférence supérieur de 23 % à celui des essais sans fichier sur CTXbench. [Résultats, tableaux 2 et 3](https://arxiv.org/html/2602.11988v2#S4.SS2)

## Que se passe-t-il si on relance le même ticket ?

Dans cette première étude, les auteurs indiquent une [température](/ia-locale-deployer-optimiser-12go/#le-tutoriel--un-gemma-4-de-12-milliards-de-paramètres-sur-une-carte-de-12-go) de 0 pour Sonnet 4.5 dans Claude Code et pour les deux modèles GPT dans Codex. Pour Qwen3-30B avec Qwen Code, ils indiquent 0,7 et un _top-p_ de 0,8. Ils ne tirent qu’une réponse par configuration et par tâche. On connaît donc les réglages employés. On ignore combien de fois chaque agent réussirait **le même ticket** en le rejouant avec ces réglages. Et comme le modèle et l’outil changent aussi, comparer Qwen et Codex ne permet pas d’isoler l’effet de la température. [Configuration des agents, section 4.1](https://arxiv.org/html/2602.11988v2#S4.SS1)

Prakhar Khatri a pris un autre parti dans une prépublication de juillet 2026. Il lance chaque tâche trois fois par condition. Quand l’agent a fini, il récupère les tests de la PR qui avait résolu le ticket et les exécute sur le code proposé. L’agent n’a pas accès à ces tests pendant qu’il travaille. Voici deux des trois conditions étudiées. [Méthode et résultats de Khatri, tableau 1](https://arxiv.org/html/2607.27250v1#S4.SS1)

| Agent et modèle             |  Sans consignes du dépôt | Avec le contenu du fichier fourni à l’agent |
| --------------------------- | -----------------------: | ------------------------------------------: |
| Claude Code avec Sonnet 4.6 | 24 essais réussis sur 45 |                                   25 sur 45 |
| Codex CLI avec GPT-5.5      | 30 essais réussis sur 51 |                                   29 sur 51 |

Pourquoi 45 essais pour Claude ? Quinze tickets, trois passages par ticket. Codex en a reçu deux de plus. Pour l’analyse, Khatri fait la moyenne des trois passages sur chaque ticket, puis permute les conditions **au sein du même ticket**. Trois passages sur un bug de pagination restent trois tentatives de résoudre le même problème. Les compter comme trois bugs distincts donnerait trop de poids à ce ticket. Le test global sur les trois conditions ne détecte de différence pour aucun des deux agents (_p_ = 1,00 pour Claude et 0,66 pour Codex). Avec si peu de tickets, un petit effet reste possible. [Analyse statistique, sections 3.6 et 4.1](https://arxiv.org/html/2607.27250v1#S3.SS6)

## Et mon connecteur ?

Les deux études comptent les tickets dont le correctif passe les tests. Dans mon cas, j’ai arrêté l’agent au stade du plan. Un agent peut réussir les tests en écrivant un deuxième connecteur, puis me laisser deux implémentations à maintenir. À l’inverse, je peux lui demander de reprendre le connecteur existant et découvrir à la revue qu’il ne convient pas à cette source. Le taux de tickets résolus ne dit pas combien de doublons je devrai faire enlever.

Pour ce ticket, je sais ce que j’ai corrigé à la [revue du plan](/de-jira-a-la-pull-request-mes-agents-ia-au-travail/#de-la-demande-jira-au-plan-que-nous-acceptons). Avant d’ajouter une consigne que l’agent relirait aussi bien pour un bug de pagination que pour une nouvelle source, j’aimerais savoir à quelle fréquence il passe à côté d’un connecteur existant.

## Qu’est-ce que je perdrais si je retirais la consigne ?

Chez Y Combinator, Boris Cherny raconte qu’au passage à Opus 5, l’équipe de Claude Code a retiré environ 80 % de son prompt système. Certaines lignes corrigeaient des comportements que l’équipe observait avec les modèles précédents. Pour savoir lesquelles remettre, Cherny propose d’utiliser le nouveau modèle et d’attendre de le voir buter plusieurs fois sur la même difficulté. « Only when you see it repeatedly stumble on the same thing, that’s when you add it back. » [Boris Cherny chez Y Combinator, vidéo officielle, passage à partir de 7 min 20](https://www.youtube.com/watch?v=qyPCVqFUyDo&t=440s)

L’équipe d’Organized AI transpose cette idée au dépôt. Au prochain changement de modèle, elle propose de garder une copie du harnais, cet ensemble de consignes, d’outils et de contrôles qui entourent l’agent. On peut alors désactiver une consigne ou une _skill_ et rejouer des tâches du projet. Les permissions et les commandes de vérification gardent leur rôle pendant l’essai. Si je change aussi les tests, comment saurai-je ce que le retrait de la consigne a changé ? [Guide d’Organized AI sur la révision du harnais](https://github.com/Organized-AI/organized-codebase/blob/main/DOCUMENTATION/BORIS-DELETE-YOUR-CLAUDE-MD-GUIDE.md)

Pour mon connecteur, je repartirais du dépôt tel qu’il était avant ma revue. Même ticket, même modèle, une conversation neuve à chaque essai. Je lui demanderais plusieurs fois un plan, avec puis sans la phrase « Cherche un connecteur existant avant d’en créer un ». À la relecture, je regarderais s’il nomme le bon connecteur et s’il explique en quoi celui-ci convient à la source. Je glisserais aussi un ticket où le connecteur existant ne convient pas. Si ma règle évite un doublon mais pousse l’agent à réutiliser le mauvais composant, j’aimerais le savoir avant de la laisser dans mon `AGENTS.md`.

Sur ce point-là, je suis loin d’être un exemple. Je trouve mon harnais plutôt bien fichu. J’avais activé Caveman en avril 2026 et cet été, il tournait encore. À force de le bidouiller, j’obtenais des réponses tout à fait correctes, jusque dans les commentaires sur GitHub. À les lire, j’aurais eu du mal à deviner que Caveman était derrière. J’avais pourtant `[CAVEMAN]` sous les yeux dans la [ligne de statut de Claude Code](https://github.com/JuliusBrussee/caveman/blob/56875e883fe1a5a855f790e566f8a780efc93f09/hooks/caveman-statusline.sh). Et ça faisait belle lurette qu’il ne me servait plus à rien.

On a tous des fantômes dans nos placards. Le mien s’appelait Caveman. Et vous, quel vieux réglage traîne encore dans le vôtre ?
