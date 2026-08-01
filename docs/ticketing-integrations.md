# Intégrations billetterie

## Objectif

Double usage le **jour J** :

| Rôle | Besoin | Source de vérité |
|------|--------|------------------|
| **Production / sécurité** | Combien / qui est sur site (jauge) | Scan **billetterie** (WeezAccess, etc.) |
| **Relations presse** | Quels journalistes sont arrivés | PR Event 360 **Jour J** (`checked_in_at`) |

**Un scan d’entrée** (billetterie) → la prod a sa jauge légale ; PR360 synchronise les scans presse pour le RP.

---

## Accès dans l’app

Menu événement → **Billetterie** (`/admin/events/:eventId/ticketing`).

Parcours guidé en 4 étapes :

1. **Fournisseur** — Weezevent, Billetweb, Eventbrite, Shotgun  
2. **Connexion** — bac à sable (sans clé) ou live (clés API)  
3. **Événement & tarif** — mapping + options auto  
4. **Actif** — stats, sync, liste des invités liés  

---

## Modes

### Bac à sable (recommandé pour démarrer)

- Aucune clé API  
- Invités et barcodes simulés  
- Bouton **Simuler un scan** pour tester le flux jusqu’à Jour J  
- Idéal formation équipe / démo client  

### Live

- Clés stockées **chiffrées** (`APP_ENCRYPTION_KEY` obligatoire)  
- Appels API provider  
- Sync scans toutes les **2 minutes** (scheduler) + bouton **Sync scans**  

---

## Options

| Option | Défaut | Effet |
|--------|--------|--------|
| Auto-provision | oui | À l’**acceptation** d’accréditation → invité / barcode billetterie |
| Auto-sync check-in | oui | Scans billetterie → `checked_in_at` journaliste (Jour J RP) |

En **refus** d’accréditation, le lien billetterie est retiré (révocation best-effort).

---

## Providers

### Weezevent

| | |
|--|--|
| Doc | https://api.weezevent.com/ |
| Clés | Back-office → **Outils → Clés API** + email/mot de passe orga |
| Lecture | Événements, tarifs, participants, `control_status` (scans) |
| Invités | API publique limitée en écriture : en live le barcode est **réservé** pour rapprochement / import ; le bac à sable simule la création |
| Contrôle d’accès terrain | **WeezAccess** (app / bornes) |

### Billetweb

| | |
|--|--|
| Doc | https://www.billetweb.fr/bo/api.php |
| Clés | `user` + `key` API |
| Lecture | Événements, tarifs, attendees + statut composté |
| Invités | Selon offre ; sinon barcode réservé + import |

### Eventbrite

| | |
|--|--|
| Doc | https://www.eventbrite.com/platform/api |
| Clés | Private token (+ organization id optionnel) |
| Lecture | Events, ticket classes, attendees / checked_in |
| Invités | Tentative création attendee si le token le permet |
| Webhooks | Supportés côté Eventbrite (évolution possible PR360) |

### Shotgun

| | |
|--|--|
| Doc | https://support-pro.shotgun.live/ |
| Clés | Organizer ID + API token |
| Live | Mapping manuel / bac à sable prioritaires (API orga variable) |

---

## Flux technique

```
Acceptation accréditation (PR360)
    → provisionJournalistGuest()
    → journalist_ticketing_links (barcode, external id)

Scan entrée (app billetterie)
    → provider.control_status / used / checked_in

Scheduler */2 min (ou Sync manuel)
    → syncTicketingCheckIns()
    → matching external id | barcode | email
    → setJournalistCheckedIn()

RP ouvre Jour J
    → liste arrivées presse à jour
```

Tables :

- `event_ticketing_connections` — config par événement  
- `journalist_ticketing_links` — lien journaliste ↔ invité billetterie  

---

## Checklist client (facile)

1. Ouvrir **Billetterie** sur l’événement  
2. Choisir le provider (ex. Weezevent)  
3. **Bac à sable** → Tester → choisir event/tarif démo → Activer  
4. Accepter une accréditation test → voir l’invité lié  
5. Simuler un scan → vérifier **Jour J**  
6. Passer en **Live** : coller les clés, re-tester, mapper le **vrai** event + tarif « Invitation Presse »  
7. Jour J : la prod scanne avec **leur** app billetterie habituelle ; le RP regarde PR360  

---

## Prérequis serveur

```bash
# 32 octets base64 — requis pour stocker les clés live
openssl rand -base64 32   # → APP_ENCRYPTION_KEY
```

Sans cette variable : mode bac à sable OK, mode live bloqué avec message clair.

---

## API admin (résumé)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/admin/events/:id/ticketing` | État + catalogue providers |
| PUT | `/api/admin/events/:id/ticketing` | Enregistrer connexion |
| POST | `.../ticketing/test` | Tester credentials |
| GET | `.../ticketing/remote-events` | Lister events externes |
| GET | `.../ticketing/remote-tickets` | Lister tarifs |
| POST | `.../ticketing/sync` | Sync scans maintenant |
| POST | `.../ticketing/provision-missing` | Provisionner les acceptés |
| POST | `.../ticketing/simulate-scan` | Scan bac à sable |
| DELETE | `.../ticketing` | Déconnecter |

Réservé **admin / attaché** avec accès à l’événement.

---

## Limites assumées

- Création d’invités **live** dépend des droits API de chaque billetterie (Weezevent surtout lecture) : le produit réserve toujours un barcode et documente l’import.  
- Pas de webhook Weezevent public → **polling 2 min** (acceptable jour J).  
- La **jauge légale globale** (public + presse + staff) reste côté billetterie ; PR360 affiche la **presse** et les liens d’invités.  

---

## Évolutions possibles

- Webhook Eventbrite natif  
- Création invité Weezevent via partenariat API write  
- Export CSV barcodes pour import billetterie en un clic  
- Affichage « jauge presse » consolidée sur le dashboard event  
