# ADR-002 — PlayCanvas Engine pour le prototype TSI et Colyseus comme serveur candidat

- **Statut :** PlayCanvas accepté pour le prototype ; production non encore figée
- **Date :** 5 novembre 2026
- **Contexte :** le fondateur souhaite un moteur accessible en ligne, un développement piloté par le code et GitHub, une licence permissive, Android/iOS comme cibles et une priorité aux solutions gratuites. Le choix précédent d'Unreal est remplacé pour le prototype.

## Décisions

1. Le prototype client utilise **PlayCanvas Engine 2.23.3**, installé depuis npm et versionné dans le dépôt.
2. Le client est écrit en TypeScript, construit avec Vite et exécuté d'abord dans un navigateur.
3. Le projet utilise PlayCanvas Engine directement ; l'éditeur visuel PlayCanvas n'est pas un prérequis.
4. La licence MIT du moteur est retenue comme base permissive pour le prototype et l'exploitation commerciale, sous réserve de respecter les licences et notices des dépendances et ressources tierces.
5. **Colyseus 0.18.x / Node.js / TypeScript** devient le premier candidat à prototyper pour les rooms, le matchmaking et la synchronisation d'état autoritaire.
6. Firebase Authentication, Cloud Firestore et Cloudinary restent les services de compte, de données persistantes et de médias conformément à ADR-001.
7. Render reste exclu.
8. PlayCanvas n'est pas déclaré plus performant qu'Unreal Engine 6. Le choix est motivé par le workflow web, l'accès au code, la licence et la capacité à prototyper en TypeScript. La performance mobile et la capacité à porter le jeu final restent à prouver.
9. Colyseus et son transport WebSocket ne sont pas encore validés pour un Battle Royale à 60 joueurs. La cadence, la latence, la perte de paquets et le comportement réseau doivent passer des tests avant la production.

## Motifs

La documentation officielle PlayCanvas présente un moteur web open source basé sur WebGL 2 et WebGPU, avec des déclarations TypeScript et une utilisation autonome via npm/Vite. Le moteur peut être utilisé sans dépendre de l'éditeur visuel hébergé.

Colyseus est un framework Node.js open source qui fournit des rooms, du matchmaking et une synchronisation d'état où le serveur modifie l'état autoritaire. Il possède un SDK TypeScript compatible avec des clients web et PlayCanvas.

## Limites connues

- Le moteur PlayCanvas est un moteur web. Le rendu dans un navigateur mobile ou une WebView n'est pas équivalent par défaut à un moteur 3D natif.
- WebGL 2 doit rester le profil de compatibilité ; WebGPU est progressif et dépend du navigateur et de l'appareil.
- Les performances, la batterie, le chauffage, la mémoire et le son doivent être mesurés sur des téléphones réels.
- Colyseus utilise WebSocket par défaut. WebSocket repose sur TCP et peut subir des délais de livraison liés à la tête de ligne lorsque des paquets sont perdus ; il ne faut pas supposer que ce transport est optimal pour un shooter rapide.
- Le navigateur n'expose pas un socket UDP brut. WebTransport et WebRTC DataChannels sont des pistes à tester si WebSocket ne satisfait pas les objectifs.
- La capacité de 60 joueurs reste une cible de conception, pas une capacité démontrée.
- Les assets générés par primitives dans le prototype sont des blocs de validation, pas les modèles 3D finaux.

## Portée de la première preuve

Le premier Field Test doit prouver :
- scène 3D chargée et stable ;
- caméra troisième personne ;
- déplacement clavier et tactile ;
- caméra souris/tactile ;
- tir et rechargement ;
- cibles de pratique et HUD ;
- build web reproductible ;
- tests de performance de base sur téléphone.

Le jalon réseau suivant doit prouver :
- un client PlayCanvas rejoint une room locale ;
- le serveur valide les inputs et l'état du joueur ;
- les autres clients reçoivent un état synchronisé ;
- les tirs et dégâts sont calculés côté serveur ;
- les résultats ne peuvent pas être modifiés depuis le client.

## Conditions de reconsidération

Reconsidérer PlayCanvas pour la production si les tests montrent des limites non acceptables en rendu, commandes tactiles, stabilité ou performances sur téléphones ciblés.

Reconsidérer Colyseus/WebSocket si la latence, les pertes, le coût de synchronisation ou la capacité par room échouent aux critères réseau. Le choix du moteur client et celui du serveur doivent pouvoir évoluer séparément.

## Sources officielles

- [PlayCanvas Engine](https://playcanvas.com/products/engine)
- [PlayCanvas — Engine standalone](https://developer.playcanvas.com/user-manual/engine/standalone/)
- [PlayCanvas — API reference](https://api.playcanvas.com/engine/)
- [PlayCanvas — Free and paid Editor plans](https://playcanvas.com/plans)
- [Colyseus — Framework](https://docs.colyseus.io/)
- [Colyseus — State synchronization](https://docs.colyseus.io/state)
- [Colyseus — Getting started](https://docs.colyseus.io/getting-started)
