# ADR-003 — Architecture runtime unique de TSI

- **Statut :** accepté pour le prototype et le vertical slice
- **Date :** 5 novembre 2026
- **Périmètre :** dépôt `abohlea/TSI`

## Décision

Le seul chemin de développement actif est :

- `prototype/` — client PlayCanvas, TypeScript, Vite et Capacitor Android.
- `backend/realtime/` — serveur Colyseus autoritaire, validation des entrées, combat et sessions.
- `backend/firebase/` — règles Firestore, émulateur et tests de sécurité.
- `docs/` — GDD, TDD, ADR, direction artistique et critères de production.

Le client ne décide jamais des dégâts, éliminations, munitions ou résultats compétitifs. Les événements de combat sont validés par le serveur Colyseus. Firebase Authentication sert à obtenir une identité vérifiée et un ticket de session de courte durée ; Firestore ne sert pas à synchroniser les positions à chaque frame.

## Dossiers historiques

`game-client/` et `server/` sont des implémentations antérieures conservées pour référence et récupération ciblée de code. Ils sont gelés : aucune nouvelle fonctionnalité, aucun correctif produit et aucun déploiement ne doivent y être ajoutés. Une fonction historique ne peut être portée vers le runtime actif qu'après revue, tests et mise à jour de la documentation.

Aucun dossier historique n'est supprimé dans cette décision. Toute suppression ou migration destructive fera l'objet d'une décision distincte.

## Conséquences

- Les nouveaux changements gameplay et réseau vont uniquement dans les chemins actifs ci-dessus.
- La CI principale valide uniquement le client actif, le serveur actif et les règles Firebase.
- Le workflow Android construit l'application depuis `prototype/`.
- Les versions historiques restent lisibles mais ne sont pas des cibles de livraison.
- Une installation reproductible exige des lockfiles validés pour chaque paquet actif ; tant qu'ils manquent, la CI utilise `npm install` et ne doit pas être décrite comme totalement reproductible.

## Conditions de révision

Réviser cette décision seulement si un changement d'architecture documenté démontre un avantage mesuré, une migration testée et une parité fonctionnelle. Ne pas créer un troisième runtime concurrent.
