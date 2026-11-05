# ADR-003 — Première preuve de combat PvP autoritaire dans TSI

- **Statut :** implémentation locale en revue ; non validée pour production
- **Date :** 5 novembre 2026
- **Périmètre :** room Colyseus de développement dans `server/`

## Contexte

La room initiale validait les déplacements, les armes et les tirs sur les cibles de pratique. Le jalon suivant doit prouver que le serveur peut choisir lui-même une victime adverse, appliquer les dégâts et gérer une élimination sans accepter de résultat déclaré par le client.

## Décision

La room utilise le résolveur `server/src/combat.ts` :
1. Le serveur construit les candidats à partir de son propre état des joueurs et des cibles.
2. Un rayon horizontal calculé à partir de la position et du yaw du tireur cherche le point d'impact visible le plus proche.
3. Les boîtes d'obstacles statiques de la carte d'entraînement bloquent les tirs qui les traversent.
4. Le serveur applique 34 points de dégâts, suit les éliminations et les décès.
5. À zéro point de vie, un joueur est figé ; le serveur le replace après quatre secondes avec santé et munitions restaurées.

Aucun message client ne peut spécifier l'identité de la victime ou les dégâts appliqués.

## Limites et risques acceptés pour la preuve

- Huit connexions maximum et utilisation locale uniquement.
- Hit volumes circulaires 2D sur le plan XZ : pas de validation verticale ou de zones corporelles.
- Obstacles vérifiés uniquement avec les volumes statiques de la carte de test.
- Pas de lag compensation, équipes, assists, réanimation, prédiction/réconciliation client, matchmaking, persistance, tickets Firebase ou anti-triche de production.
- Le client `game-client/` n'est pas encore raccordé au protocole PvP de cette room.
- Le serveur refuse le mode production et écoute sur loopback ; ne pas le rendre public.

## Conséquences

Ce jalon prouve une partie de la logique d'autorité serveur, pas l'expérience compétitive complète. Le prochain incrément doit raccorder le client, valider la visée de troisième personne, puis mesurer les tirs sous latence, gigue et perte de paquets. La capacité à huit clients ne doit pas être extrapolée à un Battle Royale à 60 joueurs.

## Validation automatisée

Le workflow `.github/workflows/tsi-client.yml` exécute le typecheck, la compilation et les tests du déplacement et du combat sur chaque modification du client ou du serveur. Le workflow `.github/workflows/validate.yml` couvre les règles Firestore dans l'émulateur.
