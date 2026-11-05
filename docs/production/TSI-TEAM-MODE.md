# TSI — mode équipes 5v5 et manches successives

## Règles serveur préparées

Le module `backend/realtime/src/teamRounds.ts` contient le noyau de règles déterministes pour le mode équipes :

- deux équipes identifiées `alpha` et `bravo` ;
- affectation au côté le moins peuplé (écart maximal d'un joueur) ;
- match au meilleur des trois manches ;
- une manche dure au maximum trois minutes ;
- cinq éliminations d'équipe terminent une manche ;
- une pause de huit secondes précède la manche suivante ;
- la première équipe à gagner deux manches remporte le match ;
- à expiration du temps, le score de manche détermine le gagnant ; une égalité ne donne aucun point de manche ;
- les éliminations tardives, les mises à jour après la fin et les transitions répétées ne modifient pas un match terminé.

Les paramètres de durée et le score cible sont configurables via `TeamMatchConfig`, tandis que le format reste volontairement best-of-three pour cette première itération.

## Statut d'intégration

**Noyau de règles implémenté, intégration Colyseus/client non terminée.** Le mode actuellement exposé par `FieldTestRoom` reste FFA. Le module est une première livraison testable isolément ; il ne faut pas encore présenter le 5v5 comme jouable.

Avant d'activer le mode dans le matchmaking, il faut :
1. augmenter et valider la capacité de room à dix joueurs ;
2. transmettre le mode demandé et assigner chaque joueur à une équipe côté serveur ;
3. interdire les tirs alliés et comptabiliser les éliminations dans le score d'équipe ;
4. synchroniser équipe, manche, scores et compte à rebours aux clients ;
5. réinitialiser santé, munitions, positions et états à chaque nouvelle manche ;
6. persister le résultat final et couvrir les déconnexions/reconnexions ;
7. ajouter des tests d'intégration avec plusieurs clients Colyseus.

Les règles sont couvertes par `backend/realtime/tests/teamRounds.test.ts`. La CI doit confirmer le typecheck et les tests avant de déclarer ce noyau validé.
