---
title: 'Certification CCAR-F : les cinq domaines expliqués avec un remboursement'
excerpt: 'Qui peut autoriser un remboursement de 800 dollars ? Du choix des outils au test de la caisse, un exemple et un schéma pour chacun des cinq domaines de la certification Claude Certified Architect.'
category: IA
tags: [certification, claude, agents, mcp]
author: Jonathan Cattelain
publishDate: 2026-11-25T20:30:00Z
draft: false
image: ~/assets/images/ccar-f-enquete-paiement/retour-au-comptoir.png
imageAlt: 'Au comptoir des retours, une conseillère examine un reçu de 800 dollars.'
---

<div class="tldr">

- Un remboursement de 800 dollars suffit à illustrer les cinq domaines de la certification **CCAR-F** : boucle agentique, outils et MCP, sorties structurées, tests dans Claude Code et reprise sur incident.
- La règle des 500 dollars ne tient pas par un prompt : elle s’applique dans le backend déterministe (ou via un hook `PreToolUse`), avec transfert automatique au conseiller si `max_turns` ou `max_budget_usd` est atteint.
- Séparer `total_paye` et `frais_livraison` (`number | null`), tester la borne à un centime près (`500,00` vs `500,01`) et tracer une référence d’idempotence hors conversation rendent le parcours fiable.

</div>

Une cliente rapporte un article payé 760 dollars et réclame aussi les 40 dollars de livraison. Le magasin voudrait confier ce genre de demande à Claude. La responsable pose une condition : au-dessus de 500 dollars, elle veut donner son accord avant que l’argent parte.

Prenons ce magasin fictif pour parcourir les cinq domaines de la certification **Claude Certified Architect - Foundations**. Ce scénario métier reste simple pour isoler les choix d’architecture : séparation entre boucle du modèle et règles déterministes, conception d’outils, sorties structurées, tests et reprise sur incident.

## Architecture et orchestration (27 %) : comment Claude mène-t-il un remboursement jusqu’au bout ?

« J’ai renvoyé ma commande. Quand vais-je récupérer mes 800 dollars ? » L’application vérifie l’identité de la cliente avant de permettre à Claude de consulter sa commande. La facture indique 760 dollars d’article et 40 de livraison. Il lui manque encore une information pour agir : l’entrepôt a-t-il reçu le colis ? Claude demande à l’application d’interroger le suivi des retours. L’application exécute l’appel et lui rapporte la réponse. Si le colis est encore en chemin, Claude donne son état à la cliente et s’arrête là.

Dans notre exemple, l’entrepôt confirme la réception et les conditions du magasin permettent de rembourser les frais de port. Claude a maintenant les éléments pour déposer une demande de 800 dollars. **C’est la boucle agentique** : après chaque réponse d’un outil, Claude choisit de consulter une autre source, de lancer une action ou de répondre à la cliente.

![La cliente demande un remboursement. Claude consulte les outils du magasin et utilise leurs réponses pour préparer la demande. La caisse applique le plafond. Jusqu’à 500 $ inclus, Claude déclenche le paiement. Au-delà, la responsable doit l’autoriser. Claude vérifie le statut du paiement avant de répondre à la cliente.](~/assets/images/ccar-f-enquete-paiement/01-circuit-accord.png)

**Pour un retour à 120 dollars**, Claude déclenche le remboursement en déposant sa demande. La caisse vérifie que le montant respecte le plafond et envoie l’ordre au prestataire de paiement. À **500 dollars pile**, le magasin suit le même parcours.

**Pour les 800 dollars de cette cliente**, la caisse renvoie « accord requis ». Claude transmet à la responsable la commande, la preuve du retour et le détail des 800 dollars. Il prévient la cliente que son dossier attend une décision. Si la responsable refuse, Claude transmet le motif du refus à la cliente et la caisse garde le dossier sans paiement. Si elle donne son accord, la caisse vérifie qu’il porte sur cette commande et sur ces 800 dollars avant d’envoyer l’ordre. Une signature pour 760 dollars ne couvre que l’article.

Dans les deux parcours, la caisse conserve une référence avant l’envoi. Si le prestataire confirme le versement, Claude communique à la cliente le montant émis et la référence. Si la connexion coupe, l’outil renvoie une erreur signalant que le statut est inconnu et interdit toute relance automatique ; Claude consulte alors le registre avec cette même référence. Tant que le statut reste inconnu, il laisse le dossier ouvert et indique à la cliente que le magasin vérifie le paiement.

Claude choisit quelle information chercher. La caisse (le backend déterministe du magasin) applique la règle à chaque demande, même si Claude essaie de passer directement au paiement. Dans le Claude Agent SDK, ce garde-fou passe par un hook `PreToolUse` : il intercepte l’appel avant exécution et le bloque dès que le montant dépasse 500 dollars sans accord signé. Un hook `PostToolUse` intervient trop tard pour arrêter un virement déjà parti ; il sert plutôt après coup à journaliser l’opération ou à normaliser les données renvoyées au modèle, comme un code devise ou un horodatage retourné par l’entrepôt. Le guide CCAR-F prend justement l’exemple d’un appel bloqué au-dessus de 500 dollars. L’équipe fixe aussi une limite au nombre de tours (`max_turns`) et au budget (`max_budget_usd`). Si la boucle atteint l’une de ces limites sans résolution ni escalade, c’est l’application (la couche d’orchestration) qui transmet automatiquement le dossier à un conseiller avec le contexte accumulé. [Anthropic, fonctionnement et conditions d’arrêt d’un agent](https://www.anthropic.com/research/building-effective-agents) · [Guide CCAR-F, contrôles avant exécution, p. 7 et 8](https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946250/Claude_Certified_Architect_-_Foundations_Exam_Guide.pdf#page=7).

## Conception d’outils et intégration MCP (18 %) : que peut faire Claude au comptoir ?

« Où en est mon retour ? » et « Pouvez-vous me rembourser ? » peuvent concerner la même commande à deux minutes d’intervalle. Un outil appelé `traiter_retour` laisse une ambiguïté gênante. Est-ce qu’on ouvre la fiche ou est-ce qu’on engage de l’argent ?

Au comptoir, je donnerais à Claude deux outils distincts. L’application du magasin peut les déclarer dans le champ `tools` de l’API Claude. Quand Claude demande à consulter une commande, l’application exécute la fonction avec la référence fournie et lui renvoie le résultat. Ce circuit fonctionne sans MCP. [Anthropic, appeler une fonction depuis l’API Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview).

![Consulter la commande prend une référence et renvoie l’état du retour. Déposer une demande prend aussi un montant et renvoie un numéro de dossier.](~/assets/images/ccar-f-enquete-paiement/02-outils-comptoir.png)

Si la cliente demande des nouvelles, Claude utilise la consultation. Une fois le colis reçu, si elle réclame aussi les frais de port, il peut déposer une demande et lui communiquer le numéro du dossier. Dans les deux cas, le backend vérifie que la commande appartient à la cliente identifiée. Pour un montant supérieur à 500 dollars, seule la responsable peut autoriser le paiement depuis son interface.

J’appellerais les deux outils `consulter_retour` et `demander_remboursement`. La description du second préciserait l’unité du montant et les réponses possibles, dont « accord requis ». Claude saurait ainsi quoi annoncer à la cliente. Le serveur tire les droits de la session authentifiée et vérifie les conditions du retour avant d’accepter la demande. [Anthropic, comment définir le rôle d’un outil et choisir les informations qu’il renvoie](https://www.anthropic.com/research/writing-tools-for-agents) · [Guide CCAR-F, exemple de vérification d’identité, p. 28](https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946250/Claude_Certified_Architect_-_Foundations_Exam_Guide.pdf#page=28).

Dans notre magasin, c’est le logiciel de gestion de l’entrepôt qui enregistre la réception du colis. Pour consulter ce système depuis le comptoir, l’équipe choisit MCP (_Model Context Protocol_). L’application du magasin découvre les outils exposés par le serveur MCP et les déclare dans le champ `tools` envoyé à Claude. Quand Claude demande le statut du retour, l’application utilise son client MCP pour appeler `consulter_retour` sur le serveur MCP, qui interroge à son tour l’API de l’entrepôt avec la référence du retour. Si l’entrepôt répond « colis reçu », le serveur transmet ce statut à l’application, qui le remet à Claude. La cliente peut alors savoir où en est son retour. [Documentation MCP sur les échanges entre client et serveur](https://modelcontextprotocol.io/docs/learn/architecture).

![Le client MCP du magasin appelle consulter_retour sur le serveur MCP. Le serveur interroge le logiciel de l’entrepôt via son API et transmet le statut « colis reçu » à l’application pour Claude.](~/assets/images/ccar-f-enquete-paiement/02-connexion-entrepot.png)

## Prompts et sorties structurées (20 %) : que représentent les 800 dollars ?

Sur la facture, la cliente lit « Total payé : 800 USD, dont livraison : 40 USD ». Si Claude n’extrait qu’une seule case « montant » avec 800, le code ou le collègue qui reprend la fiche ne sait plus si les 40 dollars de livraison y sont inclus ou s’il faut les ajouter. Le schéma aura accepté un nombre valide et le magasin risque de préparer un remboursement de 840 dollars.

Je donnerais à Claude la facture avec une consigne courte : « Recopiez le total payé et les frais de livraison dans deux champs distincts. Si la facture ne détaille pas les frais, laissez leur valeur à `null`. » L’équipe configure la sortie JSON de l’API avec deux champs obligatoires. Pour les frais, le schéma accepte un nombre ou la valeur `null`. Le collègue qui instruit le dossier peut ensuite comparer chaque valeur à la ligne correspondante.

![La facture indique 800 USD au total, dont 40 de livraison. La fiche garde les deux valeurs séparées. Si la livraison est offerte, les frais valent zéro ; si le détail manque, ils restent à null.](~/assets/images/ccar-f-enquete-paiement/03-lignes-facture.png)

Essayez la même consigne avec une facture qui porte « Livraison offerte », puis avec un ticket qui indique seulement « Total : 800 USD ». Dans le premier dossier, les frais valent zéro. Dans le second, on les ignore. Cette différence disparaît si le formulaire exige un nombre dans tous les cas.

Claude pourrait renvoyer 840 dans le champ « total payé » tout en respectant le type prévu. Avant de préparer le remboursement, la caisse compare donc le montant à celui de la commande. Si Claude refuse l’extraction ou si la réponse s’interrompt à la limite de tokens, l’application laisse le dossier en attente. [Documentation Anthropic sur les sorties structurées et leurs limites](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

## Configuration et usages de Claude Code (20 %) : comment tester le plafond de 500 dollars ?

Une développeuse doit modifier la caisse. Elle inscrit dans le `CLAUDE.md` du dépôt où se trouvent les tests de remboursement et comment les lancer avec un prestataire de paiement simulé. Elle demande ensuite à Claude Code de préparer deux dossiers identiques, sans accord humain. Seul le montant change d’un centime.

![Avec les autres contrôles satisfaits et sans accord humain, le test attend un paiement simulé à 500,00 USD et aucun à 500,01 USD.](~/assets/images/ccar-f-enquete-paiement/04-test-plafond.png)

Je regarderais d’abord **ce que le test observe**. Si Claude Code vérifie seulement que l’écran affiche « accord requis », un bug peut laisser partir le paiement en arrière-plan tout en affichant le bon message. Le test doit compter les appels reçus par le faux prestataire. En revue, la développeuse peut remplacer exprès « supérieur à » par « supérieur ou égal à » : le cas à 500 dollars doit alors échouer. Elle rétablit la règle avant de proposer sa modification.

La développeuse donne à Claude Code la commande de test et un résultat qu’il peut vérifier lui-même. Puis elle fait rejouer la conversation des 800 dollars en environnement de test. Tant que la responsable n’a pas signé, elle s’attend à retrouver un dossier en attente et zéro ordre chez le prestataire simulé. Le premier test vérifie la règle de la caisse. Le second évalue le parcours complet de l’agent. [Bonnes pratiques de Claude Code](https://code.claude.com/docs/en/best-practices) · [Anthropic, évaluer un agent à partir du résultat observé](https://www.anthropic.com/research/demystifying-evals-for-ai-agents).

## Gestion du contexte et fiabilité (15 %) : que retrouvera le collègue demain ?

La responsable a donné son accord pour les 800 dollars. La caisse envoie l’ordre de paiement, puis la connexion coupe avant le retour du prestataire. Le lendemain, un autre conseiller reprend le dossier. La dernière note de la session indique seulement « demande transmise ». Avec cette seule phrase, impossible de répondre à la cliente qui demande si l’argent est parti.

Avant le premier envoi, le magasin attribue une référence à l’opération. Le conseiller retrouve dans le dossier la commande, le montant autorisé, l’accord et cette référence. Il peut donc interroger le registre du prestataire pour obtenir l’état à jour, même s’il n’a jamais lu la conversation et sans se fier à d’anciens statuts périmés.

![Après une coupure, le conseiller recherche la référence initiale. Un paiement confirmé permet de répondre à la cliente. Un statut inconnu impose de garder le dossier ouvert.](~/assets/images/ccar-f-enquete-paiement/05-reprise-dossier.png)

Si le registre confirme le versement, le conseiller peut en donner la référence à la cliente. Si le prestataire reste injoignable, il note « statut à vérifier » pour le collègue suivant. Dans le dossier partagé, il consigne aussi la prochaine action à mener. Anthropic décrit cette pratique de notes structurées conservées hors de la conversation pour qu’un agent puisse reprendre le travail. Ici, le registre du prestataire permet au conseiller de vérifier si le remboursement a abouti. [Anthropic, conserver le contexte d’une session à l’autre](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents).

La référence du dossier aide à retrouver le paiement. Pour pouvoir **réessayer sans rembourser deux fois**, la caisse doit aussi s’appuyer sur une garantie du prestataire. Chez Stripe, par exemple, elle peut joindre une clé d’idempotence au premier envoi, puis réutiliser la même clé avec les mêmes paramètres après une coupure. Si le délai de conservation de la clé est dépassé et que le statut reste inconnu, notre magasin confie la vérification à un conseiller avant tout nouvel envoi. [Stripe, fonctionnement et durée de conservation des clés d’idempotence](https://docs.stripe.com/api/idempotent_requests).

## Si vous préparez la certification Claude Certified Architect - Foundations

La CCAR-F aborde cinq domaines. Le guide indique la part approximative des questions notées pour chacun. Le magasin illustre ces domaines à travers cinq décisions. [Guide CCAR-F, répartition des questions, p. 3](https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946250/Claude_Certified_Architect_-_Foundations_Exam_Guide.pdf#page=3).

| Ce que l’équipe doit décider                                                  | Domaine du guide                       | Poids |
| ----------------------------------------------------------------------------- | -------------------------------------- | ----- |
| Qui consulte la commande, qui donne son accord et qui paie ?                  | Architecture et orchestration          | 27 %  |
| Quelles actions le magasin ouvre-t-il à Claude ?                              | Conception d’outils et intégration MCP | 18 %  |
| Comment séparer le total payé des frais de port ?                             | Prompts et sorties structurées         | 20 %  |
| Comment l’équipe fait-elle tester la limite de 500 dollars avec Claude Code ? | Configuration et usages de Claude Code | 20 %  |
| Quelles preuves garder pour reprendre le dossier ?                            | Gestion du contexte et fiabilité       | 15 %  |

Pour réviser, repartez du scénario de support client en page 3 du guide et essayez la première question en page 28.

<aside class="definition" aria-labelledby="modalites-examen">
<h3 id="modalites-examen">Conditions d’accès, tarif et déroulement de l’examen</h3>

Pour passer la **Claude Certified Architect - Foundations** en novembre 2026, vous devez avoir **18 ans révolus** et travailler pour une organisation membre du **Claude Partner Network**. Connectez-vous à l’Anthropic Partner Academy avec une adresse professionnelle dont Anthropic reconnaît le domaine. Vérifiez ce point avant de prévoir une date avec votre équipe.

**Côté technique**, Anthropic décrit le profil d’un architecte qui a déjà construit des applications avec Claude, en général pendant **six mois ou plus**. C’est un repère pour juger votre préparation. Le guide ne demande ni justificatif d’ancienneté ni certification préalable. Vous devriez savoir faire appeler un outil via l’API, piloter une boucle avec le Claude Agent SDK, exposer des outils via MCP et configurer Claude Code pour une équipe. Entraînez-vous aussi à obtenir une sortie structurée, à relire une modification de code en CI et à transmettre un dossier à un collègue quand le modèle manque d’informations.

**Pour vous inscrire**, ouvrez la fiche CCAR-F dans la Partner Academy, lisez le règlement et les conditions, puis confirmez votre profil. Saisissez vos noms et prénoms tels qu’ils figurent sur la pièce d’identité officielle avec photo, en cours de validité, que vous présenterez le jour J. Si vous avez besoin d’un aménagement, attendez l’accord de Pearson VUE avant de réserver. Depuis l’Academy, poursuivez chez Pearson pour choisir votre langue, votre créneau et régler l’examen.

| À prévoir     | Modalités                                                                                                                                                                                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tarif         | 125 dollars US avant remise partenaire éventuelle                                                                                                                                                                                                                                                                    |
| Épreuve       | 60 questions en 120 minutes, en anglais ou en japonais. Chaque question précise combien de réponses cocher.                                                                                                                                                                                                          |
| Cas pratiques | Pour chaque examen, Anthropic tire au sort quatre des six scénarios décrits dans le guide. Chaque scénario sert de contexte à plusieurs questions.                                                                                                                                                                   |
| Passage       | En centre ou à distance sous surveillance. Chez vous, testez OnVUE sur l’ordinateur et le réseau prévus, avec une webcam, des haut-parleurs et un micro en état de marche. Pearson VUE interdit les casques audio, les casques-micros et les écouteurs. Prévoyez une pièce calme, un bureau dégagé et un seul écran. |
| Jour J        | Acceptez l’accord de confidentialité. Rangez téléphone, notes et supports de cours.                                                                                                                                                                                                                                  |
| Réussite      | 720 points sur une échelle ajustée de 100 à 1 000. Anthropic ne publie pas de conversion en nombre de bonnes réponses.                                                                                                                                                                                               |
| Validité      | La certification reste valable **12 mois à compter de sa date d’obtention**.                                                                                                                                                                                                                                         |

[Guide CCAR-F, format et barème, p. 2](https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946250/Claude_Certified_Architect_-_Foundations_Exam_Guide.pdf#page=2) · [FAQ de la Partner Academy sur l’inscription et les tarifs](https://anthropic-partners.skilljar.com/page/faq-certifications) · [Conditions de passage à distance chez Pearson VUE](https://www.pearsonvue.com/us/en/anthropic/onvue.html).

</aside>

## Ressources officielles pour préparer l’examen

- [Guide CCAR-F, version 1.1 de novembre 2026 (PDF)](https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946250/Claude_Certified_Architect_-_Foundations_Exam_Guide.pdf). Consultez les six scénarios, puis faites les questions d’exemple de la section 9 avant de lire leurs corrigés.
- [Fiche Claude Certified Architect - Foundations](https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification). Anthropic y regroupe les cours conseillés, les conditions de certification, le règlement et l’inscription.
- [Parcours de préparation de l’Anthropic Partner Academy](https://anthropic-partners.skilljar.com/page/claude-certification-exam-prep-courses). Choisissez le parcours _Architect - Foundations_ pour travailler les domaines sur lesquels vous hésitez.
- [FAQ des certifications Anthropic](https://anthropic-partners.skilljar.com/page/faq-certifications) et [espace candidat Pearson VUE](https://www.pearsonvue.com/us/en/anthropic.html). Vérifiez l’accès de votre organisation auprès de l’Academy et les conditions de passage auprès de Pearson.
