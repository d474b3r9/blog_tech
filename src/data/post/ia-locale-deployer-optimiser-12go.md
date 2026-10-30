---
publishDate: 2026-10-30T13:30:00Z
title: 'Un LLM local de 262 144 tokens sur une carte de 12 Go : mes mesures sur treize modèles'
excerpt: 'Le tutoriel Ollama pas à pas, les réglages qui fonctionnent et les chiffres de treize modèles (Gemma, Mistral, Qwen, GLM) sur une RTX 3080 Ti : vitesse, VRAM, RAM et contexte maximal.'
category: IA
tags:
  - ia-locale
  - ollama
  - gemma
  - benchmark
draft: false
image: ~/assets/images/ia-locale-deployer-optimiser-12go/ia-locale-12go-cover.png
imageAlt: 'Une barre de mémoire de 12 288 Mio en pointillés, remplie en bleu par les poids du modèle, avec une petite marge libre à droite. À côté, la vitesse de 123,9 tokens par seconde. Titre : 262 144 tokens dans 12 Go.'
author: Jonathan Cattelain
---

J'ai plusieurs fois parlé d'IA en local avec des collègues, sans que personne ne montre de chiffres. J'ai refait le test sur ma machine en notant tout : un Gemma 4 12B qui tient 262 144 tokens dans 12 Go de VRAM, et douze autres modèles mesurés, avec le tutoriel pour reproduire.

<div class="tldr">

⚡ **TL;DR : l'article en 3 points**

- **Ce qui tient** : un Gemma 4 12B garde ses 262 144 tokens de contexte dans les 12 Go d'une RTX 3080 Ti, de 100 à 107 tokens par seconde en génération longue et 30 à pleine fenêtre. Son cache KV ne grossit que de 8,5 Kio par token. Sa justesse, sur 280 questions MMLU-Pro en réponse directe : 57,9 %.
- **Ce qui s'effondre** : les modèles de 9 à 14 milliards décrochent entre 16 K et 32 K de contexte, et les denses de 24 à 27 milliards qui débordent en RAM tombent à 4-6 tokens par seconde. Les MoE (Qwen3.6 35B-A3B, GLM-4.7-Flash) restent entre 25 et 44.
- **Comment le reproduire** : six étapes (VRAM libre, variables d'environnement, `pull`, Modelfile, vérification, montée en contexte), sur un i9-9900K, 32 Go de DDR4-3200 et une 3080 Ti de 12 Go.

</div>

## Entre collègues, on échangeait des impressions, pas des chiffres

On se disait que ça tournait bien, que c'était rapide, que ça rentrait. Personne ne posait sur la table la quantification, le contexte, la VRAM consommée, les tokens par seconde, ni le moment où ça s'effondre. Ce qui fonctionne vraiment reste flou tant que personne ne montre ses mesures.

Je n'avais rien à poser dessus. Il y a quelques mois, j'avais fait tourner Gemma 4 sur une RTX 3080 Ti à plus de 70 tokens par seconde. Puis j'ai formaté la machine, et avec elle ont disparu le tag exact, les paramètres et les mesures de mémoire. Une vitesse sans configuration reproductible, c'est une anecdote, pas un résultat.

Cette fois, j'ai tout noté. Gemma 4 12B, Ollama 0.40.13, 12 Go de VRAM : entre 100 et 107 tokens par seconde en génération longue, 124 sur un prompt court. Les 262 144 tokens de contexte maximal tiennent entièrement dans la carte, à 30 tokens par seconde. Puis j'ai poussé la machine avec douze autres modèles, du 9B au 35B.

<div class="definition">

**LLM, modèle local, Ollama, paramètres**

Un LLM (grand modèle de langage) est le type de modèle derrière les assistants comme ChatGPT : il prédit le texte qui suit, un morceau à la fois. Un modèle local tourne sur votre propre machine plutôt que chez un fournisseur. Ollama est le logiciel qui télécharge ces modèles et les fait fonctionner. Un modèle « 12B » a 12 milliards de paramètres, aussi appelés poids : les nombres appris à l'entraînement. Plus il en a, plus il est lourd à stocker.

</div>

<div class="definition">

**Token, contexte, tokens par seconde**

Un token est le morceau de texte que le modèle lit et écrit : un mot courant en fait un ou deux, un mot rare ou du code davantage. Le contexte est la fenêtre de tokens que le modèle a sous les yeux : votre question, l'historique de la conversation et sa propre réponse. Les tokens par seconde mesurent la vitesse à laquelle il écrit.

</div>

## Faire entrer un modèle dans 12 Go est un problème d'arithmétique

Deux postes de dépense : les poids du modèle, et le cache KV, la mémoire où le modèle garde le contexte de la conversation. Le premier est fixe. Le second grossit avec la fenêtre de contexte.

<div class="definition">

**GPU, VRAM, CPU, RAM**

Le GPU est la carte graphique : il calcule très vite et dispose de sa propre mémoire, la VRAM. Le CPU est le processeur, qui travaille avec la RAM de la machine, plus abondante mais bien plus lente à lire. Un modèle tourne à pleine vitesse quand tout tient dans la VRAM. Sinon, une partie passe en RAM et la vitesse chute, comme vous le verrez plus bas.

</div>

Voici ce que la bibliothèque Ollama annonce pour Gemma 4 ([page des tags](https://ollama.com/library/gemma4/tags)), avec ce que j'ai effectivement mesuré :

| Tag                        | Taille | Sur 12 Go                                                |
| -------------------------- | ------ | -------------------------------------------------------- |
| `gemma4:12b-it-q4_K_M`     | 8,0 Go | Celui que j'ai testé : tient à 262 144 tokens, 100 % GPU |
| `gemma4:12b-it-qat`        | 7,2 Go | Plus de marge, non testé                                 |
| `gemma4:e4b-it-qat`        | 6,1 Go | Plan B pour un long contexte, non testé                  |
| `gemma4:12b-it-q8_0`       | 13 Go  | Ne rentre pas                                            |
| `gemma4:26b-a4b-it-q4_K_M` | 17 Go  | Ne rentre pas : de 48 à 66 % des couches en RAM          |

tailles des tags Gemma 4 sur Ollama

<div class="definition">

**Quantification (q4_K_M, q8_0, qat)**

Un modèle est un très grand tableau de nombres, les poids. Les quantifier, c'est les stocker avec moins de bits pour que le fichier soit plus léger, au prix d'un peu de précision. Le suffixe indique le niveau : `q8_0` garde environ 8 bits par poids, `q4_K_M` environ 4. Sur Gemma 4 12B, cela fait la différence entre 13 Go (`q8_0`, qui ne rentre pas) et 8,0 Go (`q4_K_M`, qui rentre). `qat` désigne une quantification prévue dès l'entraînement du modèle.

</div>

La [FAQ d'Ollama](https://docs.ollama.com/faq) indique une fenêtre de 4096 tokens par défaut, et le modèle en annonce 256K au maximum. Entre les deux, c'est votre VRAM qui tranche. Je m'attendais à ce que le cache soit le piège. Pas ici.

L'API d'Ollama (`/api/show`) donne l'architecture du modèle : 48 couches, dont 40 à fenêtre glissante de 1 024 tokens et 8 couches globales avec une seule tête KV. Le cache des 40 premières a une taille fixe, 340 Mio. Celui des 8 globales grandit de 8,5 Kio par token : 34 Mio à 4 096 tokens, 136 Mio à 16 384, soit environ 2,2 Go en extrapolant à 262 144. C'est ce qui rend le long contexte possible sur ce modèle.

<div class="definition">

**Attention, cache KV, fenêtre glissante, Flash Attention**

À chaque nouveau token, le modèle « regarde » les précédents : c'est le mécanisme d'attention. Pour ne pas tout recalculer, il garde des résultats intermédiaires en mémoire : c'est le cache KV (key-value). Plus le contexte est long, plus il grossit, sauf dans une couche à fenêtre glissante, qui ne regarde que les derniers tokens (ici 1 024) et garde donc un cache de taille fixe. Une couche globale regarde tout le contexte, et son cache grossit avec lui. Moins il y a de têtes KV (les unités de calcul parallèles de l'attention), plus le cache par token est petit. Flash Attention est une manière plus économe en mémoire de calculer l'attention : Ollama en a besoin pour quantifier ce cache.

</div>

![Une barre de 12 288 Mio découpée en segments : bureau Windows 609, poids du modèle 7 024, modèle assistant 591, calcul 277, cache KV à fenêtre glissante 340, cache KV global 136, non attribué 743, libre 2 568.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-vram-repartition.svg)

où passent les 12 288 Mio avec Gemma 4 12B en contexte 16 384

Le détail vient du journal du serveur Ollama (poids, caches, buffer de calcul), complété par `nvidia-smi` pour le total. Deux points à noter. Ollama charge un second modèle, « gemma4-assistant » (428 Mio de poids), dont je n'ai pas vérifié le rôle. Et `ollama ps` affiche 1,2 Go de taille pour ce modèle alors que `nvidia-smi` en voit 9 720 Mio : je me fie à `nvidia-smi`.

## Le tutoriel : un Gemma 4 de 12 milliards de paramètres sur une carte de 12 Go

Ma machine : Windows 11, Core i9-9900K (8 cœurs, 16 threads), 32 Go de DDR4-3200, RTX 3080 Ti de 12 Go sur PCIe 3.0 x16, pilote NVIDIA 591.86, Ollama 0.40.13. Les commandes sont en PowerShell.

**Étape 1, mesurer la VRAM libre.** Fermez tout ce qui utilise le GPU (navigateur, lecteur vidéo, jeux) et lisez la mémoire au repos.

```powershell
nvidia-smi --query-gpu=memory.used,memory.total --format=csv
```

lecture de la VRAM avant de lancer Ollama

![Sortie de nvidia-smi : 609 MiB utilisés sur 12288 MiB.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-vram-repos.png)

609 Mio utilisés au repos sur 12 288 Mio

Chez moi, Windows en prend déjà 609. Il reste 11 679 Mio, pas 12 288.

**Étape 2, les variables d'environnement.** Flash Attention est nécessaire pour quantifier le cache KV. En `q8_0`, ce dernier prend deux fois moins de place qu'en 16 bits. Et `OLLAMA_NUM_PARALLEL=1` évite de réserver de la mémoire de contexte pour des requêtes parallèles dont vous n'avez pas besoin (la FAQ d'Ollama indique que la mémoire requise est multipliée par ce nombre).

```powershell
[Environment]::SetEnvironmentVariable('OLLAMA_FLASH_ATTENTION','1','User')
[Environment]::SetEnvironmentVariable('OLLAMA_KV_CACHE_TYPE','q8_0','User')
[Environment]::SetEnvironmentVariable('OLLAMA_NUM_PARALLEL','1','User')
```

variables d'environnement du serveur Ollama

Ollama ne les lit qu'au démarrage : quittez-le depuis la zone de notification, relancez-le, puis vérifiez.

![Trois commandes GetEnvironmentVariable qui renvoient 1, q8_0 et 1.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-env-vars.png)

vérification des trois variables

**Étape 3, télécharger le modèle.** 8,0 Go.

```powershell
ollama pull gemma4:12b-it-q4_K_M
ollama list
```

téléchargement du tag et lecture de son identifiant

Notez l'ID de la colonne `ID` : un tag Ollama peut être republié. Le mien est `6114515d63c1`. Ollama m'a signalé une version plus récente du tag. Après un nouveau `pull`, l'ID était resté identique, donc rien n'avait changé.

**Étape 4, le Modelfile.** Il fixe le contexte à 16 384 tokens et reprend les réglages d'échantillonnage de la page du modèle.

```
FROM gemma4:12b-it-q4_K_M
PARAMETER num_ctx 16384
PARAMETER temperature 1.0
PARAMETER top_p 0.95
PARAMETER top_k 64
```

Modelfile pour 12 Go de VRAM

<div class="definition">

**Modelfile, num_ctx, température, top_k, top_p**

Un Modelfile est une recette : il part d'un modèle existant (`FROM`) et fixe ses réglages. `num_ctx` est la taille du contexte, en tokens. La température règle le hasard dans le choix du mot suivant : à 0, le modèle prend toujours le plus probable, à 1 il laisse plus de variété. `top_k` limite le choix aux k mots les plus probables, `top_p` aux plus probables dont les probabilités cumulées atteignent p (ici 64 et 95 %). Ces valeurs viennent de la page du modèle.

</div>

```powershell
ollama create gemma4-12b-16k -f Modelfile
```

création du modèle avec son contexte

![Terminal montrant le contenu du Modelfile, la commande ollama create qui se termine par success, puis la liste des modèles avec gemma4-12b-16k en tête.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-create-modelfile.png)

création de gemma4-12b-16k et liste des modèles installés

**Étape 5, lancer et vérifier.** Dans un premier terminal, lancez le modèle avec les statistiques. Dans un second, pendant la génération, vérifiez où il tourne.

```powershell
ollama run gemma4-12b-16k --verbose
ollama ps
nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,power.draw,temperature.gpu --format=csv
```

lancement, répartition CPU/GPU et état de la carte

![ollama ps indique 100% GPU et un contexte de 16384. nvidia-smi indique 9720 MiB utilisés sur 12288, 85 % d'utilisation, 333 W et 78 degrés. Le processus llama-server occupe 1841 Mo de RAM.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-gemma-en-charge.png)

gemma 4 12b pendant une génération, 100 % GPU et 9 720 Mio de VRAM

La colonne `PROCESSOR` doit afficher `100% GPU`. Un `48%/52% CPU/GPU` signifie que le modèle déborde en RAM, et que vos tokens par seconde vont s'effondrer. Les statistiques arrivent à la fin de la réponse.

![Statistiques d'Ollama : chargement 8,7 secondes, évaluation du prompt à 268 tokens par seconde, génération de 3510 tokens à 107 tokens par seconde.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-gemma-verbose.png)

statistiques de la commande --verbose après 3 510 tokens générés

**Étape 6, monter le contexte.** La règle : augmentez `num_ctx` par paliers jusqu'à ce que `PROCESSOR` quitte `100% GPU`, puis reculez d'un palier. Pour un test ponctuel, passez l'option par l'API.

```powershell
$body = @{
  model   = 'gemma4:12b-it-q4_K_M'
  prompt  = 'Résume ce texte.'
  stream  = $false
  options = @{ num_ctx = 262144; num_predict = 64 }
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post http://127.0.0.1:11434/api/generate -Body $body -ContentType 'application/json'
```

requête avec un contexte de 262 144 tokens

## Les mesures : 262 144 tokens dans 12 Go

J'ai répété cette requête à sept tailles de contexte, avec un prompt de taille croissante, 64 tokens générés, une température de 0 et un seul passage par palier.

| `num_ctx` | Tokens envoyés | Prompt (tok/s) | Génération (tok/s) | VRAM totale (Mio) |
| --------- | -------------- | -------------- | ------------------ | ----------------- |
| 4 096     | 3 284          | 2 371          | 123,9              | 9 097             |
| 16 384    | 8 195          | 2 677          | 130,8              | 9 512             |
| 32 768    | 16 387         | 2 520          | 123,2              | 9 418             |
| 65 536    | 32 771         | 2 241          | 98,2               | 9 864             |
| 131 072   | 65 539         | 1 824          | 88,9               | 10 792            |
| 196 608   | 166 632        | 1 171          | 60,5               | 11 720            |
| 262 144   | 222 515        | 695            | 30,1               | 11 966            |

gemma 4 12b q4_K_M, toujours 100 % GPU sur 12 288 Mio de VRAM

La colonne « Prompt » donne la vitesse à laquelle le modèle lit votre texte, bien plus rapide que celle à laquelle il écrit (« Génération »). Le modèle reste à 100 % GPU sur toute la plage. À 262 144, il reste 322 Mio de marge. La vitesse, elle, tombe de 124 à 30 tokens par seconde : l'attention doit parcourir tout le cache. Les deux derniers paliers contiennent plus de tokens que visé (166 632 et 222 515), car le tokenizer (le découpeur de texte en tokens) découpe mes lignes numérotées plus finement que prévu. Ce sont les nombres réels qui comptent.

Autre écart à noter. Sur des générations courtes, j'ai mesuré de 113 à 120 tokens par seconde sur cinq passages. Sur des générations de 2 000 à 3 500 tokens, entre 100 et 107. Même modèle, même carte. Je n'ai pas isolé la cause : contexte qui se remplit, ou carte qui chauffe (78 °C, 333 W sur 350 W dans ma capture). Mes 70 tokens par seconde d'il y a quelques mois, eux, ne sont pas comparables : autre tag, autre configuration.

## Douze autres modèles : seuls les MoE survivent au débordement

Même protocole, même machine, `num_thread` à 8, cache KV en `q8_0`. J'ai monté le contexte de 4 096 jusqu'au maximum du modèle, et arrêté dès qu'un palier passait sous 1,5 token par seconde ou laissait moins de 2,5 Go de RAM libre. Les prompts contenaient de 2 000 à 20 000 tokens. Les poids sont ceux de `ollama list`.

![Barres horizontales de la vitesse de génération à 4096 tokens de contexte : Gemma 4 12B 123,9 tokens par seconde, six modèles de 9 à 22 milliards entre 56,6 et 73,1 tous en VRAM, quatre MoE entre 39,8 et 44,5 avec des couches en RAM, et trois modèles denses de 24 à 27 milliards entre 4,3 et 5,9.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-benchmark-4k.svg)

vitesse de génération à 4 096 tokens de contexte selon le modèle

| Modèle                | Go  | CPU / GPU | tok/s à 4 K | Contexte max testé (tok/s)       |
| --------------------- | --- | --------- | ----------- | -------------------------------- |
| Gemma 4 12B           | 8,0 | 100 % GPU | 123,9       | 262 144 (30,1)                   |
| Ministral-3 14B       | 9,1 | 100 % GPU | 73,1        | 16 K en GPU pur ; 262 144 (1,8)  |
| Qwen3.5 9B            | 10  | 100 % GPU | 70,9        | 32 K en GPU pur ; 262 144 (6,2)  |
| GLM4 9B               | 10  | 100 % GPU | 71,0        | 32 K en GPU pur ; 131 072 (10,1) |
| Qwen2.5-Coder 14B     | 9,0 | 100 % GPU | 66,0        | 16 K en GPU pur ; 32 K (5,1)     |
| Codestral 22B         | 9,6 | 100 % GPU | 56,6        | 16 K (9,5) ; 32 K (2,5)          |
| Qwen3.6 35B-A3B       | 23  | 58 / 42   | 44,5        | 262 144 (37,1)                   |
| Qwen3-Coder 30B-A3B   | 18  | 45 / 55   | 40,9        | 131 072 (24,1) ; 262 144 (5,9)   |
| GLM-4.7-Flash         | 19  | 46 / 54   | 40,2        | 202 752 (25,5)                   |
| Gemma 4 26B-A4B       | 17  | 48 / 52   | 39,8        | 262 144 (29,3)                   |
| Devstral Small 2 24B  | 15  | 37 / 63   | 5,9         | 262 144 (1,3)                    |
| Mistral Small 3.2 24B | 15  | 37 / 63   | 5,2         | 131 072 (1,6)                    |
| Qwen3.8 27B           | 17  | 44 / 56   | 4,3         | 262 144 (2,0)                    |

treize modèles sur une RTX 3080 Ti de 12 Go et 32 Go de DDR4-3200, tous en q4_K_M sauf Qwen3.5 9B et GLM4 9B (q8_0) et Codestral 22B (q3_K_S)

<div class="definition">

**Modèle dense, MoE (mixture of experts) et débordement en RAM**

Dans un modèle dense, tous les paramètres travaillent pour chaque token produit. Un MoE (mixture of experts, « mélange d'experts ») remplace une partie de ses couches par plusieurs sous-réseaux, les experts, et un routeur choisit à chaque token seulement quelques-uns d'entre eux. Les autres restent au repos pour ce token. Ce ne sont pas des spécialistes étiquetés (maths, code, droit) : leur répartition du travail est apprise à l'entraînement.

Deux chiffres le résument. Le total, par exemple 35 milliards de paramètres pour Qwen3.6 35B-A3B, dit ce qu'il faut stocker : tous les experts doivent rester en mémoire. Le nombre actif (le « A3B » : 3 milliards) dit ce qui est lu à chaque token, donc la vitesse.

Quand le modèle ne tient pas dans la VRAM, Ollama laisse une partie des couches en RAM, que le CPU traite. C'est la colonne « CPU / GPU » du tableau.

</div>

**Un modèle dense qui déborde est inutilisable.** Mistral Small, Devstral et Qwen3.8 tournent entre 4 et 6 tokens par seconde dès 4 096 de contexte. Les couches restées en RAM sont lues à la vitesse de la mémoire : environ 51 Go/s pour ma DDR4-3200 en double canal (calcul : 3 200 MT/s × 8 octets × 2), contre 912 Go/s annoncés pour la carte.

**Un MoE s'en sort.** Qwen3.6 35B-A3B pèse 23 Go, soit près du double de la VRAM. Il génère à 44,5 tokens par seconde, et à 37,1 avec 262 144 de contexte, avec 63 % des couches sur le CPU et 17 Go de RAM côté Ollama. Un MoE ne lit qu'une petite partie de ses poids par token (3 milliards de paramètres actifs, d'après son nom). C'est la seule famille qui rend un modèle de 30 milliards utilisable sur cette carte. Mon coup de cœur technique, c'est GLM-4.7-Flash : son contexte maximal de 202 752 tokens tourne à 25,5 tokens par seconde.

**Le contexte long dépend de l'architecture.** Gemma garde 262 144 tokens en VRAM. Ministral, Qwen3.5, GLM4 et Qwen2.5-Coder décrochent entre 16 K et 32 K : leur cache déborde et des couches passent sur le CPU. Je n'ai pas ouvert leurs architectures. Le débordement précoce suggère un cache plus gros par token que celui de Gemma.

**Attention à la RAM.** À 262 144, Devstral a demandé 39 Go au total et laissé 410 Mo de RAM libre : au bord du swap (quand la RAM est pleine, Windows utilise le disque comme mémoire de secours, bien plus lente). Qwen3-Coder, à 262 144, tombe à 5,9 tokens par seconde avec 4,3 Go libres, alors qu'il tenait 24,1 à 131 072. Un contexte maximal sur le papier n'est pas un contexte utilisable.

Dernier réglage testé : le nombre de threads (les fils de calcul du processeur). Sur Qwen3.6 35B-A3B, 4 threads donnent 40 tokens par seconde, 8, 12 et 16 donnent 43 dans les trois cas. Mon hypothèse « 8 cœurs physiques valent mieux que 16 threads » ne se vérifie pas. J'ai laissé 8.

![Ollama ps affiche Qwen3.6 35B-A3B de 23 Go avec 58 % CPU et 42 % GPU et un contexte de 4096. nvidia-smi indique 11312 MiB de VRAM utilisés. Le processus llama-server occupe 13508 Mo de RAM.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-qwen-en-charge.png)

qwen3.6 35b-a3b pendant une génération, 58 % CPU, 13,5 Go de RAM et 11 312 Mio de VRAM

![Statistiques d'Ollama pour Qwen3.6 35B-A3B : chargement 24 secondes, génération de 4057 tokens à 43 tokens par seconde.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-qwen-verbose.png)

statistiques de Qwen3.6 35B-A3B après 4 057 tokens générés, chargement de 24 secondes

## Et la justesse ? Un test maison et un benchmark indépendant

Tout ce qui précède mesure la vitesse et la mémoire. Un modèle qui répond à 124 tokens par seconde peut aussi répondre faux à 124 tokens par seconde. J'ai donc mesuré la justesse de deux façons, qui ne disent pas la même chose.

<div class="definition">

**Benchmark, MMLU-Pro, GPQA Diamond, réponse directe, graine fixe**

Un benchmark est une série de questions identiques posées à tous les modèles et corrigées automatiquement, pour comparer des scores. MMLU-Pro réunit des questions à choix multiples de connaissances générales sur 14 disciplines, avec dix choix par question. GPQA Diamond compte 198 questions de sciences de niveau master. En réponse directe, le modèle répond tout de suite, sans écrire son raisonnement ; en mode raisonnement, il « réfléchit » par écrit avant de répondre, ce qui améliore souvent le score. Une température de 0 et une graine fixe rendent le test reproductible : même réponse à la même question, mêmes 280 questions tirées à chaque fois. La marge d'erreur est l'incertitude du score due au nombre limité de questions. La contamination, c'est quand le modèle a déjà vu les questions pendant son entraînement.

</div>

**Mon test, sur mes quantifications.** 280 questions du jeu [MMLU-Pro](https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro) (licence MIT), tirées au hasard avec une graine fixe : 20 par discipline sur 14. Chaque question a dix choix, donc le hasard donne 10 %. Même consigne pour tous : répondre par une seule lettre, température 0, contexte de 4 096, mode raisonnement désactivé. Douze modèles sur treize : GLM-4.7-Flash n'a pas pu passer le test, la machine manquait de mémoire et la tâche a été arrêtée.

| Modèle                 | Score (justes sur 280) | Invalides |
| ---------------------- | ---------------------- | --------- |
| Gemma 4 26B-A4B        | 65,7 % (184)           | 11        |
| Qwen3.8 27B            | 63,6 % (178)           | 0         |
| Qwen3.6 35B-A3B        | 61,4 % (172)           | 0         |
| Gemma 4 12B            | 57,9 % (162)           | 9         |
| Mistral Small 3.2 24B  | 53,6 % (150)           | 1         |
| Qwen3.5 9B             | 53,6 % (150)           | 0         |
| Devstral Small 2 24B   | 52,1 % (146)           | 0         |
| Qwen3-Coder 30B-A3B    | 51,4 % (144)           | 0         |
| Ministral-3 14B        | 50,0 % (140)           | 1         |
| Qwen2.5-Coder 14B      | 43,2 % (121)           | 0         |
| GLM4 9B                | 39,3 % (110)           | 0         |
| Codestral 22B (q3_K_S) | 28,9 % (81)            | 8         |

MMLU-Pro en réponse directe, 280 questions, une quantification par modèle comme dans mes mesures de vitesse

Avec 280 questions, la marge d'erreur est d'environ 3 points par modèle : sous 6 points d'écart, je ne classe pas. Les réponses invalides comptent comme fausses, donc les scores de Gemma 4 (9 et 11 invalides) et de Codestral (8) sont peut-être un peu sous-estimés. Surtout, ce n'est pas le protocole prévu par la fiche du jeu, qui demande un raisonnement pas à pas et annonce jusqu'à 19 points de perte sans lui pour GPT-4o : mes scores ne sont pas comparables aux scores publiés.

**Un benchmark indépendant, sur les modèles d'origine.** Aucun ne couvre mes treize modèles. [Artificial Analysis](https://artificialanalysis.ai/leaderboards/models) ne chiffre qu'un seul d'entre eux, Qwen3.8 27B, et seulement en indice composite. [LiveBench](https://livebench.ai/) en retrouve deux, dont un qui n'est probablement pas le bon : le Devstral du classement semble être le 123B, pas le 24B que j'ai testé. Le plus utile est celui d'[Epoch AI](https://epoch.ai/benchmarks/gpqa-diamond), qui exécute lui-même GPQA Diamond, 198 questions de sciences de niveau master, avec un protocole identique pour tous les modèles. Cinq des miens y figurent.

| Modèle                | GPQA Diamond | Marge d'erreur |
| --------------------- | ------------ | -------------- |
| Qwen3.6 35B-A3B       | 83,8 %       | ± 2,6          |
| Qwen3.5 9B            | 79,0 %       | ± 2,4          |
| Gemma 4 26B-A4B       | 73,2 %       | ± 3,2          |
| GLM-4.7-Flash         | 60,5 %       | ± 2,9          |
| Mistral Small 3.2 24B | 49,1 %       | ± 2,8          |

GPQA Diamond mesuré par Epoch AI en août 2026, le hasard donne 25 %

Les deux mesures ne classent pas pareil. Chez Epoch, Qwen3.5 9B (79,0 %) devance largement Mistral Small 3.2 (49,1 %). Chez moi, en réponse directe, ils sont à égalité à 53,6 %. Je n'explique pas cet écart. L'hypothèse est que le raisonnement avantage Qwen3.5, je ne l'ai pas testée.

![Treize lignes classées par vitesse. Pour chaque modèle, quatre barres : la vitesse à 4096 tokens de contexte, la justesse sur mon test MMLU-Pro (douze modèles), la justesse GPQA Diamond d'Epoch (cinq modèles), et le contexte utilisable à 20 tokens par seconde ou plus, avec le rang dans chaque critère. Gemma 4 12B est premier en vitesse, Gemma 4 26B-A4B premier sur mon test, Qwen3.6 35B-A3B premier chez Epoch, et trois modèles denses n'ont aucun palier de contexte à 20 tokens par seconde.](../../assets/images/ia-locale-deployer-optimiser-12go/ia-locale-classement-modeles.svg)

classement de treize modèles par vitesse, justesse et contexte

Pour choisir, voici ce que disent ces critères ensemble :

**Le plus rapide, tout en VRAM.** Gemma 4 12B : 123,9 tokens par seconde, 262 144 tokens de contexte, 100 % GPU, et 57,9 % sur mon test, à égalité avec les modèles qui le suivent dans la marge d'erreur.

**Le plus de justesse avec raisonnement.** Qwen3.6 35B-A3B : 83,8 % chez Epoch, 61,4 % chez moi, 44,5 tokens par seconde, 262 144 tokens à 37,1 tokens par seconde. Il pèse 23 Go : 63 % des couches sur le CPU, 17 Go de RAM.

**Le plus de justesse en réponse directe.** Gemma 4 26B-A4B : 65,7 % chez moi, 73,2 % chez Epoch, 39,8 tokens par seconde, 262 144 tokens à 29,3 tokens par seconde, avec près de la moitié des couches sur le CPU.

**Un bon compromis tout en VRAM avec raisonnement.** Qwen3.5 9B : 79,0 % chez Epoch, 53,6 % chez moi, 70,9 tokens par seconde, 65 536 tokens à plus de 20 tokens par seconde.

**Les moins adaptés à cette carte.** Qwen3.8 27B répond bien (63,6 %) mais à 4,3 tokens par seconde, comme Devstral Small 2 (5,9) et Mistral Small 3.2 (5,2). Codestral 22B (28,9 %), GLM4 9B (39,3 %) et Qwen2.5-Coder 14B (43,2 %) sont les plus faibles de mon test.

**Et pour le code ?** Aucun benchmark indépendant que j'ai lu ne couvre mes modèles de code. Il reste ce que les éditeurs déclarent dans leurs fiches : des chiffres **non indépendants**, mesurés avec leur propre protocole, dont le mode de raisonnement et la plage de dates ne sont presque jamais précisés. [Evidently AI](https://www.evidentlyai.com/blog/llm-coding-benchmarks) décrit ces benchmarks : LiveCodeBench renouvelle ses problèmes dans le temps pour limiter la contamination, SWE-bench demande de corriger des tickets GitHub réels. Je ne les mets pas dans le graphique : seuls deux benchmarks sont déclarés par plusieurs de mes modèles, avec un harnais différent pour chacun.

<div class="definition">

**LiveCodeBench, SWE-bench, HumanEval, MBPP, Pass@5, harnais**

LiveCodeBench propose des problèmes de programmation renouvelés dans le temps. SWE-bench Verified demande de corriger de vrais tickets GitHub. HumanEval et MBPP sont de courts exercices de fonctions Python, vérifiés par des tests. Pass@5 compte l'exercice réussi si au moins une de cinq tentatives passe les tests. Le harnais (ou scaffold) est le programme qui entoure le modèle pendant le test, avec ses outils, ses consignes et ses limites : deux harnais différents donnent des scores qui ne se comparent pas.

</div>

| Modèle          | LiveCodeBench v6 déclaré |
| --------------- | ------------------------ |
| Qwen3.8 27B     | 90,3                     |
| Qwen3.6 35B-A3B | 80,4                     |
| Gemma 4 26B-A4B | 77,1                     |
| Gemma 4 12B     | 72,0                     |
| Qwen3.5 9B      | 65,6                     |
| GLM-4.7-Flash   | 64,0                     |

LiveCodeBench v6 déclaré par chaque éditeur, non indépendant, mode de raisonnement et plage de dates non précisés

| Modèle               | SWE-bench Verified déclaré | Harnais indiqué par l'éditeur          |
| -------------------- | -------------------------- | -------------------------------------- |
| Qwen3.6 35B-A3B      | 73,4                       | scaffold interne, contexte 200K        |
| Devstral Small 2 24B | 68,0 %                     | non précisé sur la fiche               |
| GLM-4.7-Flash        | 59,2                       | température 0,7, 16 384 tokens maximum |

SWE-bench Verified déclaré par chaque éditeur, non indépendant, harnais différents

À lire comme des déclarations, pas comme un classement. Qwen reprend d'ailleurs dans sa fiche les 77,1 et 80,0 de Google pour Gemma 4 26B-A4B et 31B : c'est la même valeur, et je ne sais pas si Qwen l'a remesurée. Les autres ne déclarent rien de comparable : Mistral Small 3.2 (HumanEval Plus 92,9 % et MBPP Plus 78,3 %, en Pass@5), GLM4 9B (HumanEval 71,8), Qwen2.5-Coder 14B (HumanEval 89,6 et LiveCodeBench 23,4 sur une autre fenêtre de dates, d'après son rapport technique), Ministral-3 14B (LiveCodeBench 0,646, dans un tableau « Reasoning » et sans version précisée). Qwen3-Coder 30B-A3B n'a aucun chiffre dans sa fiche, et ceux de Codestral sont dans des images que je n'ai pas lues.

Quatre précautions. D'abord, ces deux benchmarks de justesse mesurent des connaissances et du raisonnement généraux, pas la qualité du code : mes quatre modèles de code (Qwen3-Coder 30B-A3B, Devstral Small 2, Codestral, Qwen2.5-Coder 14B) sont jugés sur des questions générales. Ensuite, Epoch teste les modèles d'origine alors que mon test porte sur mes quantifications : Codestral, en `q3_K_S`, est la plus agressive, et je ne sais pas ce qu'elle coûte en justesse. Puis les suffixes des variantes d'Epoch (`_none`, `_minimal`) ne sont pas documentés dans les fichiers que j'ai lus : j'ai pris la variante sans suffixe, ou la seule disponible (`_minimal` pour Gemma 4). Enfin, MMLU-Pro est public depuis juin 2024 : un modèle a pu en croiser des questions à l'entraînement.

## Ce qui manque encore

- **Mes mesures.** Un seul passage par palier de contexte, un prompt répété, un seul jeu de 280 questions pour la justesse, en réponse directe et sans raisonnement pas à pas. Les vitesses des paliers à moitié remplis sont plus hautes que celles d'un contexte réellement plein (Gemma : 30 tokens par seconde à 222 515 tokens). Le tag que j'ai testé, `12b-it-q4_K_M`, n'est pas le plus économe : le `qat` plus petit reste à mesurer.
- **GLM-4.7-Flash.** Il manque à mon test de justesse : la machine a manqué de mémoire et la tâche a été arrêtée avant son passage. Il n'a que le GPQA d'Epoch (60,5 %).
- **Le rôle du modèle assistant.** Ollama en charge un second avec Gemma. Je n'ai pas vérifié ce qu'il apporte en vitesse.
- **Les architectures des autres modèles.** Je constate leur débordement vers 16 K ou 32 K, je n'ai pas mesuré la taille de leur cache par token.

## Ce que je retiens

**Compter la mémoire avant de télécharger.** Poids plus cache de contexte, puis `ollama ps` et `nvidia-smi`. Notez votre configuration et l'ID du modèle dès qu'elle fonctionne : j'ai perdu la première.

**Préférer un MoE à un modèle dense quand ça déborde.** Sur 12 Go de VRAM et 32 Go de RAM, un 35B-A3B tourne à 44 tokens par seconde, un 24B dense à 5.

**Choisir sur trois critères, pas sur un seul.** Un modèle rapide qui répond faux ne sert à rien : croisez la vitesse mesurée chez vous, le contexte tenu en mémoire et un benchmark indépendant. Sur mes treize modèles, aucun benchmark indépendant n'en couvre plus de cinq : j'ai donc mesuré moi-même douze d'entre eux.

**Se méfier du contexte maximal annoncé.** Gemma garde 262 144 tokens en VRAM. D'autres décrochent à 16 K ou 32 K, et Qwen3-Coder tient 262 144 en mémoire mais plus en vitesse : 5,9 tokens par seconde contre 24,1 à 131 072.

**Laisser les threads par défaut.** Entre 8 et 16, je n'ai pas vu de différence.

**Publier ses chiffres avec sa configuration.** Un chiffre sans tag, sans contexte ni machine ne sert à personne.

Ces mesures valent pour ma machine. Sur la vôtre, le tableau changera ; la méthode, non. Si vous mesurez la même chose, je serais curieux de comparer.

## Un dernier point : la porte vers l'extérieur

Ces chiffres ne répondent pas à une question de déploiement : ce que le modèle peut atteindre depuis votre machine. Ma consigne, à titre de précaution : ne donnez pas de connexion sortante à un modèle d'origine chinoise, et n'exposez pas son serveur sur le réseau. Deux évaluations publiées en 2025 vont dans ce sens, chacune avec ses limites. Elles portent sur DeepSeek, pas sur les Qwen de mon comparatif.

**NIST (CAISI), 30 septembre 2025.** Des agents construits sur DeepSeek R1-0528, le plus sûr des modèles testés, ont suivi des instructions malveillantes 12 fois plus souvent que ceux des modèles américains de référence. Dans l'environnement simulé, les agents détournés ont envoyé des courriels d'hameçonnage, exécuté un logiciel malveillant et divulgué des identifiants. L'évaluation vient d'une agence américaine et mesure des agents de test, pas des déploiements réels.

**CrowdStrike, 20 novembre 2025.** DeepSeek R1 produit du code vulnérable dans 19 % des cas sans contexte, et dans 27,2 % quand le prompt décrit un système de contrôle industriel au Tibet. L'étude (30 250 prompts par modèle) précise que l'effet est une moyenne sur la durée et ne prétend pas à une intention.

Aucune des deux n'établit que le modèle a été conçu pour nuire. Elles suffisent pour ne pas laisser un agent sortir librement. Voici la configuration Ollama, d'après la documentation d'Ollama et celle de Microsoft. J'ai testé l'étape 3 sur ma machine :

```powershell
# 1. Ne pas exposer le serveur : laisser OLLAMA_HOST non défini (127.0.0.1:11434 par défaut)
# 2. Couper les fonctions cloud d'Ollama
[Environment]::SetEnvironmentVariable('OLLAMA_NO_CLOUD','1','User')
# 3. Bloquer les connexions sortantes des exécutables Ollama (console administrateur)
$o = "$env:LOCALAPPDATA\Programs\Ollama"
foreach ($exe in 'ollama.exe','ollama app.exe','lib\ollama\llama-server.exe') {
  New-NetFirewallRule -DisplayName "Ollama sortie bloquée : $exe" -Direction Outbound -Program "$o\$exe" -Action Block
}
```

configuration pour limiter Ollama vers l'extérieur, à retirer le temps d'un pull

Résultat de mon test (Windows 11, Ollama 0.40.13, règles créées dans une console administrateur puis supprimées) : avec les trois règles, `ollama list`, `ollama run` et l'API locale répondent normalement, à 103,8 tokens par seconde en génération. `ollama pull` échoue en moins d'une seconde avec « An established connection was aborted by the software in your host machine ». Une fois les règles supprimées, le `pull` refonctionne. Le blocage laisse donc passer le trafic local vers 127.0.0.1 et coupe la sortie vers Internet.

Deux limites. Il borne Ollama, pas la machine. Ollama ne fait que produire du texte : c'est l'agent branché dessus qui exécute des commandes, avec vos droits, et la règle ne vise que trois programmes. Un agent n'a pas besoin d'être malin pour sortir : `curl`, PowerShell, Python ou le navigateur ne sont pas concernés. Simon Willison résume le risque en trois conditions réunies : l'accès à vos données privées, l'exposition à du contenu non fiable, et la capacité de communiquer vers l'extérieur. Son seul remède : ne jamais réunir les trois. Couper la sortie retire la troisième, à condition de la couper pour tout ce que l'agent peut lancer. L'isolation doit porter sur l'environnement d'exécution de l'agent, dans un conteneur sans route vers l'extérieur par exemple. Je n'ai pas testé cette isolation, ni `OLLAMA_NO_CLOUD`, ni ce qu'un modèle en train d'agir peut tenter : cela pourrait faire l'objet de tests dans un autre article. La raison de cette précaution, les biais des modèles et les poids empoisonnés, fera l'objet d'un article prochainement.

## Sources

- [Ollama, bibliothèque Gemma 4](https://ollama.com/library/gemma4/tags) et [FAQ Ollama](https://docs.ollama.com/faq)
- [Ollama, bibliothèque de modèles](https://ollama.com/library) (tailles et contextes maximaux des tags testés)
- [MMLU-Pro, jeu de données](https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro) (licence MIT) et [le papier, arXiv 2406.01574](https://arxiv.org/abs/2406.01574)
- [Evidently AI, LLM coding benchmarks](https://www.evidentlyai.com/blog/llm-coding-benchmarks) (description des benchmarks, sans score de modèle)
- Fiches des éditeurs, source des chiffres de code déclarés : [Gemma 4 12B](https://huggingface.co/google/gemma-4-12b-it), [Gemma 4 26B-A4B](https://huggingface.co/google/gemma-4-26B-A4B-it), [Qwen3.5 9B](https://huggingface.co/Qwen/Qwen3.5-9B), [Qwen3.6 35B-A3B](https://huggingface.co/Qwen/Qwen3.6-35B-A3B), [Qwen3.8 27B](https://huggingface.co/Qwen/Qwen3.8-27B), [Devstral Small 2](https://huggingface.co/mistralai/Devstral-Small-2-24B-Instruct-2512), [GLM-4.7-Flash](https://huggingface.co/zai-org/GLM-4.7-Flash), [Mistral Small 3.2](https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506), [Ministral 3 14B](https://huggingface.co/mistralai/Ministral-3-14B-Instruct-2512), [GLM-4-9B-Chat](https://huggingface.co/THUDM/glm-4-9b-chat), [rapport technique Qwen2.5-Coder](https://arxiv.org/abs/2409.12186)
- [Epoch AI, GPQA Diamond](https://epoch.ai/benchmarks/gpqa-diamond) et [données ouvertes d'Epoch AI](https://epoch.ai/data), licence CC BY 4.0
- [Artificial Analysis, leaderboard](https://artificialanalysis.ai/leaderboards/models) et [LiveBench](https://livebench.ai/) (couverture insuffisante de mes modèles)
- [NIST CAISI, Evaluation of DeepSeek AI Models](https://www.nist.gov/news-events/news/2025/09/caisi-evaluation-deepseek-ai-models-finds-shortcomings-and-risks)
- [CrowdStrike, Hidden Vulnerabilities in AI-Coded Software](https://www.crowdstrike.com/en-us/blog/crowdstrike-researchers-identify-hidden-vulnerabilities-ai-coded-software/)
- [Simon Willison, The lethal trifecta for AI agents: private data, untrusted content, and external communication](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- [Microsoft, New-NetFirewallRule](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule)
