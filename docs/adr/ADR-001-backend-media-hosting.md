# ADR-001 — Firebase, Firestore, Cloudinary et hébergement

- **Statut :** accepté comme contrainte de conception V1
- **Date :** 5 novembre 2026
- **Contexte :** TSI est un shooter compétitif mobile-first. Le fondateur retient Firebase, Cloud Firestore et Cloudinary, exclut Render et privilégie les offres gratuites.

## Décision

1. Firebase Authentication gère l'identité des joueurs.
2. Cloud Firestore conserve les profils, inventaires cosmétiques, progression, configurations et résultats validés.
3. Cloudinary diffuse les avatars, portraits, bannières, actualités et médias promotionnels.
4. Render est exclu.
5. Les combats sont simulés par des serveurs Unreal dédiés et autoritaires.
6. Une API serveur de confiance gère les tickets, les récompenses et les écritures sensibles.
7. Pendant la préproduction, priorité aux quotas gratuits, aux émulateurs et aux serveurs locaux.
8. Aucun hébergeur de production ne sera sélectionné avant les tests UDP, latence, CPU, mémoire, coûts et disponibilité.

## Motifs

Firebase fournit identité et données persistantes. Firestore convient aux données de compte à fréquence modérée, pas à la simulation à chaque tick. Cloudinary est adapté aux médias visuels. Un serveur de partie distinct est nécessaire pour garder l'autorité compétitive et protéger les résultats.

## Conséquences et limites

- Quota Firestore Standard gratuit publié : 1 Gio, 50 000 lectures/jour, 20 000 écritures/jour, 20 000 suppressions/jour et 10 Gio de transfert sortant/mois pour une base éligible.
- Offre Cloudinary Free publiée : 25 crédits mensuels partagés entre transformations, stockage et bande passante.
- Cloud Functions for Firebase nécessite le plan Blaze ; l'utilisation de quotas sans frais sur Blaze ne signifie pas que Spark permet le déploiement.
- Les quotas peuvent être dépassés ou suspendre un service. Ils ne garantissent ni capacité ni disponibilité à grande échelle.
- Aucune offre gratuite n'est considérée comme garantie de serveurs Unreal dédiés performants.
- Une infrastructure publique fiable nécessitera probablement un budget. Aucune dépense ne sera engagée sans autorisation du fondateur.

## Mesures de sécurité

- Aucun secret Firebase Admin ou Cloudinary dans le client.
- Règles Firestore restrictives et refus par défaut.
- Progression, récompenses et résultats modifiés uniquement par un service de confiance.
- App Check est une couche complémentaire et ne remplace pas l'autorité serveur.
- Tickets de match courts et liés à une session.

## Conditions de réexamen

Réexaminer cette décision si les quotas sont insuffisants, si les conditions des fournisseurs changent, si la latence impose une autre région, si un stockage de gros paquets de contenu devient nécessaire ou si le budget de production est approuvé.

## Sources officielles

- [Firebase Pricing Plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Firestore Pricing](https://firebase.google.com/docs/firestore/pricing)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Cloud Functions FAQ](https://firebase.google.com/docs/functions/faq-and-troubleshooting)
- [Cloudinary Pricing](https://cloudinary.com/pricing)
- [Cloudinary Billing and Plans](https://cloudinary.com/documentation/billing_and_plans)
- [Epic Dedicated Servers](https://dev.epicgames.com/documentation/unreal-engine/setting-up-dedicated-servers-in-unreal-engine)
