# TSI — Game Design Document (GDD) V1

> **Document maître de conception — version 1.0**
>
> **Statut :** base de production proposée, à valider par la direction du projet  
> **Nom du projet :** TSI (nom de travail ; la signification officielle de l'acronyme reste à confirmer)  
> **Genre :** shooter multijoueur compétitif, avec Battle Royale comme expérience phare  
> **Priorité plateformes :** Android et iOS ; extension PC à étudier après validation du socle  
> **Langue de référence :** français ; anglais prévu pour l'internationalisation  
> **Principe directeur :** construire une propriété intellectuelle originale et une architecture capable d'évoluer, sans copier les personnages, cartes, interfaces, sons ou mécaniques distinctives d'un jeu existant.

---

## 0. Comment utiliser ce document

Ce GDD décrit **ce que TSI doit être du point de vue du joueur** : vision, règles, modes, univers, contenu, progression et critères de qualité. Il ne remplace pas les documents techniques détaillés qui suivront :

Documents associés : [TDD TSI V1 — Architecture technique](TDD_TSI_V1.md) ; [ADR-001 — Backend, médias et hébergement](adr/ADR-001-backend-media-hosting.md).

- **TDD / Architecture technique :** moteur, code, réseau, services, données, sécurité et déploiement.
- **Art Bible :** style visuel, matériaux, personnages, armes, environnements et effets.
- **Audio Bible :** identité sonore, mixage, spatialisation et musique.
- **Production Plan :** équipe, budget, dépendances, calendrier et capacité de livraison.
- **QA Plan :** stratégie de tests, appareils de référence, critères de validation et gestion des anomalies.

Les éléments sont marqués ainsi :

- **[DÉCISION PROPOSÉE]** : direction recommandée pour établir une base cohérente.
- **[À VALIDER]** : dépend d'un prototype, d'un test, du budget ou d'une décision du fondateur.
- **[POST-LANCEMENT]** : contenu volontairement exclu du premier périmètre jouable public.

Aucune date de lancement n'est promise dans ce document. Les jalons seront estimés après audit des compétences, des moyens, du prototype et des contraintes techniques.

---

# 1. Vision du produit

## 1.1 High concept

**TSI est un shooter compétitif mobile-first dans lequel des escouades s'affrontent sur des champs de bataille vastes et lisibles, tandis que des objectifs stratégiques peuvent transformer certaines routes, ressources et positions tactiques pendant la partie.**

Le jeu doit réunir quatre qualités :

1. **Des combats satisfaisants :** visée précise, retours visuels et sonores clairs, animations crédibles et maîtrise progressive.
2. **Une vraie profondeur tactique :** information, positionnement, coopération, choix d'équipement et objectifs.
3. **Une identité reconnaissable :** univers, silhouettes, cartes, couleurs, sons et narration propres à TSI.
4. **Une expérience mobile maîtrisée :** commandes personnalisables, performances stables, interface lisible et sessions adaptées aux usages mobiles.

L'ambition est internationale. La réussite ne sera pas mesurée par la seule quantité de contenu ou par une comparaison marketing avec les concurrents, mais par la qualité réelle du jeu, la rétention, l'équité compétitive, la stabilité et la confiance de la communauté.

## 1.2 Promesse au joueur

« Chaque affrontement est une décision d'équipe. L'information, le sang-froid et la maîtrise comptent autant que la précision. »

Le joueur doit pouvoir dire :
- « Je comprends pourquoi j'ai gagné ou perdu un duel. »
- « Mon équipe a pu changer le cours de la partie par une bonne décision. »
- « Je progresse grâce à ma pratique, pas parce que j'ai payé. »
- « Cette carte et cet univers ne ressemblent pas à ceux d'un autre jeu. »

## 1.3 Publics visés

- Joueurs mobiles qui aiment les shooters d'action et les parties en escouade.
- Joueurs compétitifs intéressés par la progression, le classement et la maîtrise mécanique.
- Joueurs sociaux qui souhaitent retrouver des amis, rejoindre un clan et participer à des événements.
- Joueurs attirés par des univers militaires de fiction et des environnements riches.

Le jeu doit rester accueillant pour les débutants sans supprimer la profondeur nécessaire aux joueurs expérimentés.

## 1.4 Plateformes et modèle d'expérience

**[DÉCISION PROPOSÉE]** Android et iOS en priorité, avec conception technique permettant d'étudier une version PC ultérieure.

Le cross-play entre mobile et PC n'est pas promis. Il ne sera activé que si l'équilibre des commandes, la population, la latence et les règles compétitives le justifient. Les contrôles tactiles doivent être un système de première classe, pas une adaptation tardive d'une interface PC.

**Caméra proposée :** troisième personne, avec visée resserrée et optiques adaptées aux armes. Une vue première personne complète n'est pas incluse dans le périmètre initial ; elle nécessiterait une validation spécifique de l'animation, du réseau, de l'équilibrage et de la lisibilité.

---

# 2. Piliers de conception

## Pilier A — Le combat doit être juste et compréhensible

- Réponse immédiate des commandes.
- Répartition cohérente entre précision, recul, cadence et mobilité.
- Feedback clair lorsqu'un joueur touche, subit des dégâts, recharge ou est éliminé.
- Pas de dégâts, de vitesse ou de résistance achetables.
- Les règles importantes sont validées côté serveur en multijoueur.

**Critère de réussite :** les tests joueurs montrent que les éliminations paraissent compréhensibles et que les différences de performance sont principalement liées aux décisions et à la maîtrise.

## Pilier B — Le champ de bataille évolue par les décisions

La mécanique signature proposée est le **Réseau de Front** : certains points d'intérêt possèdent des objectifs activables par une équipe. Les objectifs peuvent, pour une durée limitée et selon des règles annoncées, ouvrir un itinéraire, rétablir un relais d'information, activer une station de ravitaillement limitée ou modifier l'accès à une zone.

Principes d'équilibrage :
- Un objectif donne une option, jamais une victoire automatique.
- Le point d'objectif expose l'équipe qui le tente à un risque réel.
- Les effets sont annoncés, temporaires et compréhensibles.
- Une équipe en retard doit conserver des possibilités de contre-jeu.
- Le serveur contrôle l'activation, la durée, les récompenses et l'état du monde.

Le Réseau de Front doit être développé d'abord sous une forme limitée : un ou deux objectifs simples sur une carte de test. Les destructions massives, la météo dynamique complexe et la transformation complète de la carte sont hors périmètre initial.

## Pilier C — La coopération doit avoir un vrai rôle

- Marquage d'ennemis, de dangers, de ressources et de destinations.
- Communications rapides adaptées au tactile.
- Rôles complémentaires sans personnage obligatoire.
- Réanimation ou récupération selon les règles du mode.
- Informations partagées avec limites et contres possibles.

## Pilier D — Le jeu doit fonctionner sur de vrais téléphones

- Profils graphiques adaptés à plusieurs classes d'appareils.
- Lisibilité des ennemis et des effets à petite taille d'écran.
- Contrôles configurables.
- Gestion du chauffage, de la batterie, de la mémoire et du réseau.
- Téléchargement et mise à jour des contenus maîtrisés.

La qualité visuelle sera ambitieuse, mais la performance et la lisibilité auront priorité sur les effets coûteux qui nuisent au jeu.

---

# 3. Boucle de jeu principale

## 3.1 Boucle d'une session

1. **Préparation :** le joueur rejoint le lobby, choisit un personnage cosmétique et configure ses préférences.
2. **Formation d'équipe :** le matchmaking assemble des joueurs selon la qualité de connexion, le niveau et le temps d'attente.
3. **Déploiement :** l'escouade choisit une zone de départ selon les règles du mode.
4. **Collecte et lecture du terrain :** les joueurs trouvent du matériel dans la partie, lisent la carte et évaluent les risques.
5. **Engagement :** déplacement, prise de position, duel, coopération et utilisation des ressources.
6. **Décision stratégique :** l'équipe peut contester un objectif du Réseau de Front ou choisir de l'éviter.
7. **Convergence :** les règles de zone et les objectifs poussent les équipes à prendre des décisions de plus en plus risquées.
8. **Résolution :** victoire, défaite ou placement final ; statistiques et progression sont calculées par le serveur.
9. **Retour :** résumé, récompenses, progression, signalement éventuel et possibilité de rejouer avec l'équipe.

## 3.2 Principes de rythme

**[À VALIDER PAR PROTOTYPE]**
- Durée cible d'une partie Battle Royale : environ 15 à 20 minutes.
- Temps d'attente : afficher un état clair et éviter les recherches interminables.
- Les premières minutes doivent permettre de s'équiper et de comprendre les zones proches.
- Les engagements doivent être assez fréquents pour maintenir la tension, sans rendre la survie aléatoire.
- Les joueurs éliminés doivent recevoir un résumé utile et retrouver rapidement une nouvelle partie.

Ces valeurs sont des objectifs de conception, pas des performances déjà mesurées.

---

# 4. Modes de jeu et périmètre de lancement

La priorité est de livrer un mode phare excellent plutôt que plusieurs modes incomplets qui diviseraient la population en files d'attente.

## 4.1 TSI Battle Royale — mode phare

**[DÉCISION PROPOSÉE]** mode central du lancement.

- Carte de grande taille, composée de zones urbaines, naturelles et industrielles.
- Escouades de quatre joueurs comme format principal.
- Déploiement, collecte d'équipement en partie et zone de danger qui évolue selon un calendrier annoncé.
- Objectifs du Réseau de Front facultatifs.
- Victoire attribuée à la dernière équipe encore en jeu, selon les règles finales du mode.
- Possibilité d'ajouter le solo après tests de population et d'équilibrage.

**Capacité serveur :** commencer les prototypes à faible population, valider progressivement 20, 40 puis viser 60 joueurs par partie si les tests réseau, serveur et mobile le permettent. Le chiffre de 60 est un objectif, pas une capacité garantie. Un objectif de 100 joueurs ne sera étudié qu'après preuve de stabilité et de qualité.

## 4.2 TSI Training — indispensable dès les tests publics

- Champ de tir.
- Test des armes et des accessoires.
- Tutoriel de déplacement, visée, tir, recharge et marquage.
- Réglage de sensibilité et disposition des commandes.
- Exercices de précision et de contrôle du recul.
- Cibles et scénarios répétables.

Le mode Training doit permettre de tester les commandes sans pression et d'expliquer les mécaniques importantes.

## 4.3 TSI Tactical 5v5 — priorité après stabilisation du cœur

**[POST-LANCEMENT OU BÊTA AVANCÉE]**

Mode compétitif sur cartes plus compactes :
- Deux équipes de cinq.
- Objectif de manche clairement défini.
- Manches courtes et règles simples.
- Économie ou équipement de manche à étudier.
- Classement distinct du Battle Royale si les besoins d'équilibrage le justifient.

Le mode 5v5 n'entre dans la première version publique que si les ressources de production permettent de le livrer sans dégrader le Battle Royale.

## 4.4 TSI Extraction — extension future

**[POST-LANCEMENT]**

Mode à risque et récompense : une escouade entre dans une zone, remplit une mission, collecte des ressources et tente de s'extraire. Ce mode demandera une économie persistante, des règles anti-abus et une séparation claire entre objets de collection et avantage compétitif.

## 4.5 Modes événementiels futurs

- Matchs privés et tournois communautaires.
- Événements temporaires à règles spéciales.
- Défis de précision et de mobilité.
- Scénarios coopératifs contre l'environnement, si la qualité des adversaires IA est suffisante.

---

# 5. Monde, histoire et identité narrative

## 5.1 Direction narrative

**[DÉCISION PROPOSÉE — noms provisoires]**

TSI se déroule dans un futur proche fictif où des réseaux d'énergie, de communication et de transport sont devenus stratégiques. Plusieurs coalitions cherchent à contrôler des infrastructures capables d'influencer des régions entières.

Les combattants sont des opérateurs engagés dans des compétitions militaires encadrées, des opérations de sécurisation et des missions à objectifs. Le contexte explique les affrontements, les équipes et les saisons sans imposer de longues cinématiques avant chaque partie.

La direction artistique peut puiser dans la diversité des paysages, des matières, de l'architecture et des cultures de plusieurs régions du monde, notamment africaines, sans réduire un pays ou une culture réelle à un décor générique. Les lieux et factions doivent rester documentés, respectueux et originaux.

## 5.2 Région de lancement — concept provisoire

**Nom de travail : Kantara.**

Une région fictive traversée par un grand fleuve et structurée autour d'une ville-port, de reliefs, de zones industrielles et de petites communautés. Elle doit offrir une variété de combats et des repères visuels immédiatement reconnaissables.

Zones macro envisagées :
- **La Cité-Delta :** rues denses, toits, cours intérieures et lignes de vue courtes.
- **Le Corridor Ferroviaire :** gares, dépôts, ponts et couloirs de déplacement.
- **Les Hautes-Terres :** collines, antennes et routes exposées.
- **La Zone de Recherche :** bâtiments techniques, laboratoires et objectifs du Réseau de Front.
- **Les Rives :** villages, marais, quais et chemins de contournement.

Les noms, la disposition et les thèmes seront fixés lors du level design et de la recherche artistique.

## 5.3 Factions

Les factions sont avant tout des identités narratives et visuelles. Elles ne doivent pas donner de bonus cachés ou de statistiques supérieures.

- **Aegis :** organisation de sécurisation des infrastructures, esthétique fonctionnelle et disciplinée.
- **Frontière Libre :** coalition locale de protection et de secours, équipement adaptable.
- **Les Veilleurs :** réseau indépendant de renseignement et de médiation, esthétique discrète et technologique.

Ces noms et leur histoire restent provisoires et devront faire l'objet d'une vérification de disponibilité juridique et de marque.

## 5.4 Ton et narration

- Ton sérieux, accessible et héroïque, sans glorification gratuite de la violence.
- Histoires racontées par les lieux, les objets, les briefings courts et les événements.
- Personnages différenciés par leurs motivations, leurs voix, leur silhouette et leurs relations.
- Pas de longs dialogues imposés pendant les parties compétitives.

---

# 6. Personnages et rôles

## 6.1 Règle fondamentale

Les personnages achetables ou déblocables ne doivent pas donner un avantage direct en combat. La différence entre personnages est d'abord visuelle, narrative et expressive.

Si un système de gadgets ou de compétences est ajouté, il doit être accessible à tous par des règles équitables, clairement décrit et équilibré indépendamment du prix ou de la rareté cosmétique.

## 6.2 Rôles d'escouade proposés

- **Assaut :** polyvalence en combat et prise d'espace.
- **Reconnaissance :** observation et collecte d'informations, avec contres lisibles.
- **Soutien :** assistance à l'équipe et gestion de ressources.
- **Ingénierie :** interaction avec certains dispositifs et objectifs.

Ces rôles ne doivent pas imposer une composition obligatoire. Un joueur doit pouvoir contribuer même si son escouade n'a pas un spécialiste donné.

## 6.3 Roster initial

**[À VALIDER]** viser un petit roster de personnages fortement identifiables plutôt qu'une grande quantité de personnages superficiels. Chaque personnage devra disposer de :
- Silhouette lisible à distance.
- Palette et accessoires distinctifs.
- Tenue de base cohérente avec l'univers.
- Animations principales et expressions adaptées.
- Fiche narrative courte.
- Options cosmétiques sans impact statistique.

---

# 7. Combat, armes et équipement

## 7.1 Principes de combat

- Les tirs doivent donner une sensation cohérente entre animation, audio, recul et résultat serveur.
- La précision dépend du mouvement, de la posture, de la distance, de l'arme et de la maîtrise.
- Les dégâts, les munitions, les rechargements et l'état des joueurs sont validés par le serveur.
- Les effets visuels ne doivent pas masquer les adversaires.
- Les armes ont des usages complémentaires ; aucune arme ne doit dominer toutes les distances.

## 7.2 Familles d'armes

- Fusils d'assaut : polyvalence à moyenne portée.
- Pistolets-mitrailleurs : mobilité et courte portée.
- Fusils de précision : longue portée, cadence et risque élevés.
- Fusils à pompe : engagement rapproché.
- Mitrailleuses légères : soutien et contrôle de zone.
- Pistolets : solution secondaire.
- Équipements tactiques : fumée, protection, observation ou utilitaires selon les règles validées.

La liste exacte, les noms, les modèles et les statistiques seront établis dans une **Weapon Balance Sheet** séparée.

## 7.3 Équilibrage

Chaque arme aura une fiche mesurant au minimum :
- Dégâts par zone d'impact.
- Cadence et temps de rechargement.
- Vitesse des projectiles ou méthode de validation des impacts.
- Recul, dispersion et récupération.
- Distance d'efficacité.
- Bruit et signature visuelle.
- Temps d'élimination dans des scénarios comparables.
- Performance réseau et cohérence entre clients.

Les données ne seront pas équilibrées à partir d'une impression isolée. Elles seront confrontées à des tests reproductibles et à des données de parties.

## 7.4 Équipement et butin

- Équipement trouvé dans la partie : armes, munitions, protections et utilitaires.
- Rareté utilisée pour organiser la lisibilité et la progression du butin, pas pour rendre un achat plus puissant.
- Inventaire tactile simple, avec ramassage contextuel et option de ramassage automatique configurable.
- Comparaison claire entre objet équipé et objet trouvé.
- Limites de transport qui favorisent les choix sans créer une gestion excessive.

---

# 8. Carte et level design

## 8.1 Objectifs de la première carte

La carte de lancement doit :
- Proposer plusieurs distances d'engagement.
- Avoir des routes de rotation lisibles.
- Éviter les zones où une équipe peut contrôler sans contre-jeu toutes les sorties.
- Utiliser des repères visuels et sonores uniques.
- Fonctionner avec différents niveaux de qualité graphique.
- Garder une bonne lisibilité des silhouettes sur les petits écrans.

## 8.2 Points d'intérêt

Prévoir un ensemble limité de lieux majeurs et de zones secondaires. Chaque lieu doit être documenté par :
- Son nom et son histoire.
- Son profil de combat.
- Ses entrées et sorties.
- Ses lignes de vue.
- Ses ressources possibles.
- Ses risques de camping.
- Ses performances sur appareils de référence.
- Ses interactions avec le Réseau de Front.

## 8.3 Réseau de Front — règles initiales

La première version teste seulement quelques interactions :
1. Activation d'un relais d'information qui révèle une information limitée, pas la position exacte de tous les ennemis.
2. Ouverture temporaire d'un itinéraire secondaire.
3. Activation d'une ressource contestable et limitée.

Chaque interaction doit avoir un indicateur de durée, un son reconnaissable, un message clair et une possibilité de contestation.

---

# 9. Commandes, interface et accessibilité

## 9.1 Commandes mobiles

- Déplacement au pouce gauche.
- Caméra et visée au pouce droit.
- Tir, visée, saut, accroupissement, recharge et interaction configurables.
- Taille, position, opacité et sensibilité réglables.
- Gyroscope optionnel.
- Plusieurs préréglages de commandes.
- Assistance à la visée limitée, transparente et équilibrée.
- Possibilité de tester les réglages dans Training.

## 9.2 Interface de combat

Priorités visuelles :
1. Santé et état du joueur.
2. Arme et munitions.
3. Équipe et état des coéquipiers.
4. Carte et zone de danger.
5. Marqueurs et objectifs.
6. Informations contextuelles.

Éviter l'accumulation de notifications. Les informations critiques doivent rester lisibles sans cacher les adversaires.

## 9.3 Menus

- Connexion et profil.
- Lobby et formation d'escouade.
- Choix du mode.
- Personnages et cosmétiques.
- Paramètres de commandes et graphismes.
- Progression et missions.
- Classements.
- Boutique.
- Historique et signalements.
- Support et politique de confidentialité.

## 9.4 Accessibilité

Prévoir notamment :
- Réglage de la taille des textes.
- Sous-titres et indicateurs visuels pour certains signaux audio.
- Options de daltonisme et palettes adaptées.
- Réglage de vibration, caméra et effets.
- Tutoriel rejouable.
- Langues et formats régionaux séparés du code du jeu.

---

# 10. Progression, économie et monétisation

## 10.1 Progression

La progression doit reconnaître le temps et l'amélioration du joueur sans rendre les nouveaux joueurs impuissants.

Axes possibles :
- Niveau de compte.
- Défis quotidiens et saisonniers.
- Maîtrise d'armes fondée sur l'utilisation.
- Récompenses de participation et de performance.
- Classements compétitifs distincts par mode, lorsque la population le permet.
- Historique de statistiques et résumé de partie.

## 10.2 Monétisation

**[DÉCISION PROPOSÉE]** modèle gratuit avec achats cosmétiques, à confirmer avec l'étude économique et juridique.

Éléments potentiellement commercialisables :
- Tenues et apparences de personnages.
- Apparences d'armes.
- Emotes, animations de célébration et éléments de profil.
- Pass saisonnier à récompenses principalement cosmétiques.
- Objets de personnalisation de lobby.

Interdictions de conception :
- Pas de dégâts, de santé, de vitesse ou de précision achetables.
- Pas d'arme exclusive payante plus puissante.
- Pas de progression de combat accélérée par paiement.
- Pas de probabilités d'achat opaques.
- Pas de pression commerciale trompeuse.

Les achats, remboursements, restrictions d'âge, taxes et protections des utilisateurs devront être traités dans les politiques produit et juridiques appropriées.

---

# 11. Multijoueur, équité et sécurité — exigences de conception

La conception suppose un modèle **serveur autoritaire**. Le client affiche et prédit certains mouvements pour la fluidité, mais le serveur valide les actions qui affectent le résultat de la partie.

Le TDD devra spécifier :
- Authentification et gestion de session.
- Création et fermeture des parties.
- Matchmaking et regroupement d'amis.
- Synchronisation des positions et des actions.
- Validation des tirs, dégâts, munitions et éliminations.
- Tolérance à la perte de paquets et à la latence.
- Reconnexion lorsque c'est possible.
- Journalisation des événements critiques.
- Détection de comportements impossibles et analyse anti-triche.
- Signalement, blocage, modération et sanctions graduées.
- Protection des données personnelles et contrôle d'accès.

Aucune méthode anti-triche ne garantit une protection absolue. Le système doit combiner validation serveur, détection, mises à jour, revue des signalements et procédure d'appel.

La politique de données devra être établie avant la bêta publique : données réellement nécessaires, durée de conservation, accès, suppression, sécurité et information des joueurs.

---

# 12. Audio et direction artistique

## 12.1 Identité visuelle

Direction proposée :
- Réalisme stylisé à haute lisibilité, plutôt que photoréalisme coûteux à tout prix.
- Palette principale : bleu profond, orange de signalisation et tons naturels.
- Silhouettes fortes et équipements fonctionnels.
- Détails technologiques sobres et cohérents.
- Effets spectaculaires réservés aux événements importants.
- Interface propre, moderne et facilement identifiable.

Le logo TSI, son symbole et ses règles d'utilisation devront être définis dans l'Art Bible. Le visuel conceptuel déjà créé sert uniquement de piste d'ambiance, pas de modèle définitif des personnages ou de l'interface.

## 12.2 Audio

Priorités :
- Identification directionnelle des pas et tirs.
- Différence claire entre armes.
- Indication de distance crédible.
- Mixage qui ne fatigue pas le joueur.
- Communication d'équipe intelligible.
- Musique discrète pendant les phases de combat.
- Sons propres aux objectifs du Réseau de Front.

L'audio doit être testé avec haut-parleurs de téléphone et écouteurs courants.

---

# 13. Exigences non fonctionnelles et qualité

Les objectifs ci-dessous sont des **cibles de validation**, pas des résultats déjà obtenus.

## 13.1 Performance

- Profil de base : stabilité visée à 30 images/s sur appareils mobiles compatibles d'entrée ou milieu de gamme définis par la matrice QA.
- Profil élevé : viser 60 images/s sur appareils compatibles, lorsque la température et la consommation le permettent.
- Aucun réglage graphique ne doit dégrader la lisibilité compétitive.
- Mesurer mémoire, temps de chargement, batterie, température, réseau et stabilité.
- Prévoir des réglages automatiques et manuels.

Les appareils de référence seront définis par tests réels, pas uniquement par leur fiche commerciale.

## 13.2 Réseau et disponibilité

- Mesurer ping, gigue, perte de paquets et déconnexions.
- Sélectionner la région de serveur la plus adaptée lorsque l'offre d'infrastructure le permet.
- Ne pas démarrer une partie si le serveur ne peut pas satisfaire les conditions minimales définies.
- Suivre les erreurs de matchmaking et les échecs de connexion.
- Prévoir des tests de charge et des procédures de reprise.

## 13.3 Stabilité

- Aucun crash bloquant connu au lancement.
- Aucun bug critique non résolu sur les achats, comptes, progression ou résultats.
- Test de longues sessions et de reprise après interruption.
- Compatibilité vérifiée sur une matrice de téléphones et versions de systèmes d'exploitation déclarées.

## 13.4 Qualité compétitive

- Résultats calculés et persistés côté serveur.
- Pas de duplication exploitable d'objets ou de récompenses.
- Pas de possibilité de modifier localement les statistiques validées.
- Procédure de signalement accessible.
- Outils de revue et de sanction documentés.

---

# 14. Analytique et critères de réussite

Les métriques servent à améliorer le jeu, pas à manipuler les joueurs.

À suivre :
- Taux de crash et de déconnexion.
- Temps d'attente et taux d'échec du matchmaking.
- Latence et perte de paquets par région.
- Durée des sessions et taux de retour.
- Taux de complétion du tutoriel.
- Répartition des armes et taux de victoire.
- Écart de performance entre appareils.
- Signalements confirmés et faux positifs.
- Satisfaction des joueurs et problèmes les plus remontés.

Les objectifs chiffrés seront établis après les premiers tests. Toute collecte doit être proportionnée, expliquée et conforme aux règles applicables.

---

# 15. Périmètre de production par jalons

Le projet avance par preuves techniques et critères d'acceptation. On ne passe pas au jalon suivant uniquement parce qu'une date est arrivée.

## Jalon 0 — Préproduction

Livrables :
- GDD validé.
- Références artistiques et premières règles d'identité.
- Étude des appareils cibles.
- Prototype de réseau et choix du moteur à confirmer.
- Budget, compétences nécessaires et risques.
- Liste des décisions ouvertes.

**Sortie du jalon :** vision suffisamment précise pour autoriser les prototypes sans engager toute la production.

## Jalon 1 — Prototype de combat

Périmètre :
- Un personnage temporaire.
- Déplacement, caméra et commandes tactiles.
- Deux armes représentatives.
- Tir, dégâts, élimination et feedback.
- Petite arène de test.
- Premier test réseau avec petit nombre de joueurs.

**Critères d'acceptation :**
- Contrôles compréhensibles et personnalisables.
- Combats reproductibles et mesurables.
- État des dégâts validé par le serveur.
- Mesure de performance sur appareils réels.

## Jalon 2 — Vertical Slice

Périmètre :
- Un fragment représentatif de la future carte.
- Un personnage et un petit groupe d'armes avec qualité proche de la cible finale.
- Son, interface et animations cohérents.
- Une interaction du Réseau de Front.
- Partie réseau jouable du début à la fin.
- Profil mobile optimisé.

**Critères d'acceptation :** le slice prouve la qualité visuelle, la sensation de jeu, la performance et la faisabilité de la chaîne de production.

## Jalon 3 — Alpha Battle Royale

Périmètre :
- Carte grise complète puis progressivement artistique.
- Boucle de partie complète.
- Escouades, matchmaking, butin et zone.
- Progression minimale.
- Premiers outils d'administration et de signalement.

**Critères d'acceptation :** stabilité sur une population de test croissante, résultats cohérents et absence de faille critique connue.

## Jalon 4 — Bêta fermée et ouverte

- Tests sur différents appareils et réseaux.
- Charge serveur et simulation de pics.
- Équilibrage des armes et de la carte.
- Tests de sécurité et anti-triche.
- Tests de boutique et de progression, si activées.
- Retours structurés et corrections.

## Jalon 5 — Lancement

Le lancement n'est autorisé qu'après validation :
- Des performances et de la stabilité.
- De la capacité serveur et du support opérationnel.
- De la sécurité des comptes et des données.
- Des processus de modération et de support.
- Des règles de paiement et de remboursement.
- Des politiques de confidentialité et conditions d'utilisation.
- Des exigences des plateformes de distribution.

## Jalon 6 — Évolution

- Tactical 5v5 si le cœur du jeu est stable.
- Nouvelles cartes et saisons.
- Événements et compétitions.
- Extraction après validation de son économie et de son infrastructure.
- Extension PC uniquement après étude dédiée.

---

# 16. Risques majeurs et réponses

| Risque | Réponse de conception/production |
|---|---|
| Périmètre trop grand | Prioriser un Battle Royale de qualité ; différer les modes secondaires |
| Performances mobiles insuffisantes | Profils graphiques, tests précoces et budgets de rendu |
| Triche | Serveur autoritaire, télémétrie, détection et modération |
| Latence élevée selon les régions | Mesures réelles, choix de régions et tests réseau |
| Files d'attente fragmentées | Peu de playlists au lancement |
| Contenu coûteux à produire | Pipeline modulaire et réutilisation contrôlée des éléments |
| Déséquilibre des armes | Données de parties, tests et mises à jour documentées |
| Dépendance à un fournisseur | Évaluer coûts, portabilité, limites et plan de sortie |
| Économie injuste | Cosmétiques sans avantage compétitif |
| Équipe ou budget insuffisant | Jalons de preuve, estimation honnête et recrutement par spécialité |

---

# 17. Décisions à confirmer avant la production complète

Les choix suivants doivent être traités dans des réunions de décision ou des prototypes :

1. **Signification officielle de TSI :** nom de franchise, signification de l'acronyme et disponibilité juridique.
2. **Plateformes :** Android/iOS au lancement ; statut éventuel de PC et cross-play.
3. **Caméra :** troisième personne comme référence ; validation de la visée et des optiques.
4. **Mode phare :** Battle Royale en escouade comme priorité.
5. **Population :** objectif initial de 60 joueurs, soumis aux tests.
6. **Moteur et version :** PlayCanvas Engine 2.23.3 est retenu pour le prototype web ; sa validation comme moteur de production dépendra des tests Android/iOS, du rendu et des performances réelles.
7. **Services en ligne :** comparer une solution gérée et une infrastructure opérée par l'équipe avant de choisir.
8. **Régions de serveurs :** décision fondée sur les mesures de latence des marchés visés et les coûts.
9. **Style artistique final :** validation à travers un personnage, une arme et une zone représentatifs.
10. **Budget et équipe :** nécessaires avant tout calendrier de production crédible.

---

# 18. Glossaire

- **GDD :** Game Design Document, document décrivant l'expérience et les règles du jeu.
- **TDD :** Technical Design Document, document décrivant les solutions techniques.
- **Vertical Slice :** portion représentative du jeu, produite avec une qualité proche de la cible finale.
- **Serveur autoritaire :** serveur qui valide les actions déterminantes d'une partie.
- **Matchmaking :** système qui assemble les joueurs dans une partie.
- **Level design :** conception des espaces, parcours, combats et points d'intérêt.
- **Live Ops :** exploitation continue du jeu après son lancement.
- **Anti-triche :** ensemble de mesures de prévention, détection et sanction des comportements illicites.

---

# 19. Résumé exécutif

TSI doit être conçu comme une franchise de shooter compétitif originale, pensée d'abord pour les téléphones, avec une ambition internationale et une qualité de production élevée.

La première priorité n'est pas de promettre simultanément un Battle Royale à 100 joueurs, un mode tactique, un mode extraction et des dizaines de cartes. La priorité est de prouver un **cœur de jeu exceptionnel** : commandes mobiles, déplacements, tir, feedback, réseau fiable, sécurité et boucle Battle Royale complète.

Le premier produit à construire est donc un prototype de combat réseau, suivi d'un vertical slice représentatif, puis d'une production Battle Royale par paliers. Le Réseau de Front constitue la piste de différenciation à tester. Les modes Tactical 5v5 et Extraction enrichiront l'écosystème lorsque le socle sera suffisamment solide.

**Décision de production proposée : valider ce GDD comme base V1, lancer la préproduction, puis rédiger le TDD et l'Art Bible avant d'engager la production complète.**

---

*Fin du document — TSI GDD V1.*
