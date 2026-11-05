# TSI — mode équipes 5v5 et manches successives

## Règles serveur

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

**Le mode équipes est désormais branché à une room Colyseus dédiée et au client PlayCanvas.** Le mode FFA historique reste disponible dans `field_test`; le mode équipes est exposé dans `team_match`. Le prototype rejoint ce mode avec le paramètre URL `?mode=teams`.

La room équipes comprend :
- capacité maximale de dix joueurs et affectation alpha/bravo équilibrée ;
- tirs validés par le serveur, avec coéquipiers exclus des cibles ;
- score d'équipe, fin de manche sur cinq éliminations ou à trois minutes ;
- intermission de huit secondes, reset des opérateurs et meilleur des trois ;
- diffusion de l'équipe, des opérateurs distants, du numéro de manche, des scores et du compte à rebours ;
- dix points d'apparition distincts pour dix joueurs ;
- checkpoint Firestore après les connexions et les éliminations, puis récupération des matchs interrompus au redémarrage ;
- sauvegarde Firestore idempotente du résultat final, de l'équipe gagnante et des manches gagnées.

Les tests unitaires du noyau de règles sont dans `backend/realtime/tests/teamRounds.test.ts`. Les tests couvrent aussi la validation des équipes, le tie-break nul à la troisième manche et la récupération idempotente d'un checkpoint via Firestore Emulator.

## Limites restantes avant production

- Les tests multi-clients Colyseus, la reconnexion après déconnexion et les essais de charge restent à faire.
- La récupération après crash finalise les statistiques du dernier checkpoint durable comme match interrompu ; elle ne restaure pas la simulation en cours ni les positions, munitions ou projectiles.
- Le mécanisme de récupération au démarrage suppose une seule instance active ; un verrou/lease distribué sera requis avant le multi-instance.
- L'équilibrage se fait à l'entrée dans la room ; il ne réaffecte pas les joueurs déjà connectés.
- Le client affiche les événements de manches par notifications HUD ; un tableau de score d'équipe permanent et un écran de fin de match dédié restent à produire.
- La room est une première intégration jouable de validation, pas encore un matchmaking public de production.
