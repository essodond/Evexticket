# Intelligence assistée EVEX Ticket

## Fonctionnalités livrées

1. Recherche mobile en langage naturel avec critères structurés et résultats réels.
2. Recommandations personnalisées à partir des réservations de l’utilisateur.
3. Assistant contextuel attaché à chaque billet, sans pouvoir modifier la réservation.
4. Rappels intelligents dans l’onglet mobile **Alertes**.
5. Prévision de remplissage des prochains voyages.
6. Retard prévisionnel fondé uniquement sur un retard réellement signalé.
7. Score de risque des réservations, destiné à assister un contrôle humain.
8. Analyse automatique des avis (sentiment, thème, urgence).
9. Copilote de gestion pour l’admin général et l’admin compagnie.
10. Assistant vocal/texte du guichet pour rechercher les voyages.

## Configuration

Les variables se trouvent dans `backend/.env` et sont documentées dans
`backend/.env.example`.

```env
EVEX_AI_ENABLED=True
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_AI_MODEL=gpt-5.6-luna
OPENAI_REASONING_EFFORT=low
OPENAI_TIMEOUT_SECONDS=25
```

La clé OpenAI reste exclusivement côté Django. Si elle est vide, les écrans restent
fonctionnels grâce au moteur EVEX local. Le fournisseur peut donc être activé ou
désactivé sans nouvelle version du mobile ou du frontend.

## Sécurité et confidentialité

- Authentification obligatoire pour toutes les fonctions métier IA.
- Permissions séparées entre voyageur, agent guichet, admin compagnie et super admin.
- Limitation à 20 requêtes IA par minute et par utilisateur.
- Aucune clé fournisseur dans React, Expo ou le bundle navigateur.
- Emails et numéros de téléphone masqués avant tout appel fournisseur.
- Les journaux techniques ne conservent ni question, ni réponse, ni donnée passager.
- Les alertes de fraude ne bloquent jamais automatiquement une réservation.
- Le copilote ne peut exécuter aucune action de gestion.

## Endpoints

- `GET /api/ai/status/`
- `POST /api/ai/search/`
- `GET /api/ai/recommendations/`
- `POST /api/ai/tickets/<id>/assistant/`
- `GET|POST /api/ai/notifications/`
- `GET|PATCH /api/ai/trips/<id>/insights/`
- `GET /api/ai/bookings/<id>/risk/`
- `GET /api/ai/reviews/analysis/`
- `POST /api/ai/copilot/`
- `POST /api/ai/voice-command/`

## Limite actuelle de la prédiction de retard

Le projet ne possède pas encore d’historique GPS ou d’heures d’arrivée réelles.
EVEX n’invente donc aucun retard : la prévision affiche zéro tant qu’un agent ou un
administrateur n’a pas signalé un retard. Une future intégration GPS pourra alimenter
le même endpoint et le même écran sans changer le parcours utilisateur.
