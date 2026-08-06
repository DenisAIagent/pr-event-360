# Rapport d’audit de sécurité offensif — PR Event 360

| Champ | Valeur |
|---|---|
| **Date** | 2026-08-05 |
| **Cible** | Application SaaS relations presse (monorepo local + sondes non-auth sur URL Railway) |
| **Type** | Revue statique offensive + validations HTTP limitées (surfaces publiques) + correctifs appliqués |
| **Autorisation** | Propriétaire confirmé ; dépôt local + freeloader/paywall ; secrets collés en chat **non réutilisés** |
| **Mode patches** | `AUTO_PATCH_ALL` (lots A, B, C, E appliqués localement) |
| **Statut Git** | Modifications locales non commitées au moment du rapport |

---

## 1. Synthèse exécutive

PR Event 360 présente une **base de sécurité supérieure à la moyenne** des SaaS B2B de même taille : authentification relecture DB, multi-tenant en 404 anti-oracle, CSRF double-submit, MFA TOTP avec anti-replay, tokens d’accès hashés (256 bits), SQL paramétré, sanitization HTML + CSP, billing Stripe conçu pour n’émettre un compte qu’après paiement signé.

L’audit a toutefois mis en évidence des **faiblesses réalistes** :

1. **Rate-limit anti-bruteforce affaibli en multi-instance** sans Redis partagé (confirmé en live par headers non monotones).
2. **Sessions journaliste non révoquées** après reset de mot de passe (avant correctif).
3. **Liens magiques d’espace** encore réutilisables tant qu’ils n’étaient pas échangés (avant correctif).
4. **Confiance front** au `localStorage` pour l’affichage du back-office (avant correctif).
5. **Stripe désactivé en prod** : inscription self-serve fermée ; accès org gratuit uniquement via invitation super-admin (by design).

**Niveau global (post-correctifs code, pré-ops Redis/migration prod) :**  
**Bon à solide**, sous réserve d’exécuter la migration `0053`, de brancher Redis en multi-instance, et de faire tourner les secrets éventuellement exposés.

| Gravité | Confirmés (pré-patch) | Traités dans le code |
|---|---:|---:|
| Critical | 0 | — |
| High | 2 (PW-05, F-01) | 2 (partiel pour PW-05 : code OK, Redis ops requis) |
| Medium | 2 (F-02, PW-02) | 1 (F-02) ; PW-02 documenté non patché |
| Low | 2 (PW-06, PW-07) | 2 |
| Info | plusieurs | documentés |

**En une phrase :** PR Event 360 est un SaaS **bien défendu au niveau applicatif**, avec un historique de durcissement visible ; les risques restants sont surtout **opérationnels (Redis, secrets, migration)** et **métier (grants gratuits super-admin)**.

---

## 2. Périmètre et méthodologie

### 2.1 Inclus

- Code serveur Express (`server/src/**`) : auth, middleware, routes admin/public, billing, journaliste, production, rate-limit, JWT
- Client admin React (`client/src/admin/**`) : session, routes protégées, invite, abonnement
- Docs sécurité / rôles / architecture
- Tests existants de non-régression pentest
- Sondes HTTP **non authentifiées** sur `https://pr-event-360-production-a23e.up.railway.app` (health, billing config, login fail, org-invite invalid, CORS, rate-limit headers, etc.)

### 2.2 Exclus / non réalisés

- Exploitation avec comptes admin réels ou secrets collés en chat
- Stripe live, Google OAuth live, webhooks réels
- Tests de charge / DoS
- Accès base de production
- Exécution de la migration sur une base distante
- Configuration cloud Railway (Redis)

### 2.3 Méthode

Cinq passes : critiques évidentes → contournements → logique métier → chaînes → défense/correctifs.  
Pour chaque finding : preuve code et/ou live, impact, remédiation, tests.

---

## 3. Architecture et surface d’attaque

### 3.1 Stack

| Couche | Technologie |
|---|---|
| Client | React 18, Vite, React Router |
| API | Node / Express, Zod, Helmet, CORS |
| Auth | Argon2, JWT HS256, cookies HttpOnly, CSRF, TOTP, Google Identity |
| Données | PostgreSQL, SQL paramétré, migrations node-pg-migrate |
| Médias | Cloudinary (upload signé) |
| Paiement | Stripe Checkout + webhook (dormant si non configuré) |
| Rate-limit | express-rate-limit + Redis optionnel |

### 3.2 Frontières de confiance

```text
Internet
  ├─ Public marketing / newsroom / accréditation
  ├─ Auth admin (login, Google, reset, invite, billing)
  ├─ Espace journaliste (magic link → JWT jspace)
  ├─ Espace production (token → JWT pspace)
  └─ Webhook Stripe (signature)

Back-office authentifié
  ├─ requireAuth (DB: active, abonnement, rôle, MFA, password_changed_at)
  ├─ getAccessibleEventOrThrow (tenant + membership)
  └─ requirePlatformAdmin (intégrations, orgs, domaines)
```

### 3.3 Rôles

| Acteur | Périmètre |
|---|---|
| Non authentifié | Public + parcours signup/invite |
| Journaliste | Son dossier / événement |
| Contact production | Avis consultatif sur ses artistes |
| Assistant / Attaché | Events assignés (éditeur = attache/admin) |
| Admin org | Org entière, équipe |
| Platform admin | Multi-org, secrets, domaines custom |

---

## 4. Findings détaillés

### [PW-05] Rate-limit login multi-instance poreux — High

**Statut initial :** Confirmé par validation active + code  
**Statut post-patch :** Code corrigé ; **efficacité multi-instance dépend de Redis en prod**

**Preuve live (avant patch) :** 15 POST `/api/admin/auth/login` → jamais 429 ; `RateLimit-Remaining` non monotone (6→5→8→7…), typique de **N MemoryStore** derrière un load balancer.

**Preuve code :** `sharedStoreOrUndefined()` null sans `REDIS_URL` ; fail-open Redis en panne pour tous les limiteurs.

**Impact :** credential stuffing facilité (×N instances), surtout comptes sans MFA obligatoire (attaché/assistant).

**Correctif appliqué :**

- Store auth **fail-closed** si Redis en panne
- Clé `login:{ip}:{email_normalisé}`
- Idem reset / MFA
- Alerte boot si prod sans Redis

**Reste ops :** `REDIS_URL` + `REQUIRE_REDIS=true` en multi-instance.

**CWE / OWASP :** CWE-307 / CWE-770 — A07 Identification and Authentication Failures

---

### [F-01] Sessions journaliste non révoquées après reset MDP — High

**Statut initial :** Confirmé par analyse du code  
**Statut post-patch :** Corrigé en code + migration `0053` (à exécuter)

**Preuve :** `resetJournalistPassword` mettait à jour le hash et révoquait le magic link, **pas** le JWT `pr360_jspace` (TTL 30 j). Contrairement aux users admin (`password_changed_at`).

**Impact :** accès prolongé à PII, export RGPD, demandes, badge après « changement de mot de passe ».

**Correctif appliqué :**

- Colonne `journalists.password_changed_at`
- Mise à jour à chaque `setJournalistPassword`
- `resolveSpaceJournalist` refuse si `iat * 1000 < passwordChangedAt`
- Claims `jspace` exposent `iat`

**CWE / OWASP :** CWE-613 — A07

---

### [F-02] Magic link réutilisable jusqu’à `POST /session` — Medium

**Statut initial :** Confirmé code  
**Statut post-patch :** Corrigé (rotation au premier hit API path-token)

**Preuve :** `resolveSpaceJournalist` acceptait le bearer d’URL sans rotation ; seule `POST /session` montrait.

**Impact :** rejeu du lien email (forward, logs, historique) jusqu’à 7 jours.

**Correctif appliqué :** `issueJournalistAccessToken` immédiatement après résolution par bearer d’URL.

---

### [PW-02] Org invite → abonnement `active` sans Stripe — Medium (métier)

**Statut :** Confirmé code — **non patché** (choix produit)

**Preuve :** `createOrgAndAdmin` / `DEFAULT 'active'` sur `subscription_status` ; invitation super-admin documentée « sans paiement ».

**Impact :** free SaaS légitime via token 256 bits super-admin ; pas de freeloader anonyme.

**Recommandation :** `billing_source = 'comped' | 'stripe' | 'bootstrap'` + audit console.

---

### [PW-06] UI admin sur `localStorage` sans hydrate serveur — Low

**Statut post-patch :** Corrigé

**Preuve :** `AuthContext` initialisait l’user depuis `localStorage` ; pas de `GET /me` systématique.

**Impact :** cosplay d’UI (pas d’accès API).

**Correctif :** hydrate `/me` au boot ; purge storage si 401 ; `ProtectedRoute` attend `sessionChecked` ; `/me` renvoie le profil DB.

**CWE :** CWE-602

---

### [PW-07] Min mdp client 8 vs serveur 12 — Low

**Statut post-patch :** Corrigé (`MIN_LENGTH = 12` sur pages invite).

---

### [PW-01] Stripe off en production — Info métier

**Live :** `billingEnabled: false` ; checkout → « paiement non configuré » ; webhook non configuré.  
Mode vente assistée (`mailto` / invite). **Pas un bypass** : freeloader ne peut pas self-serve.

---

### [PW-08] Page `/admin/abonnement/succes` publique — Info

Message cosmétique uniquement ; aucun compte créé sans webhook.

---

### Contrôles déjà efficaces (échantillons)

| Contrôle | Preuve |
|---|---|
| API admin sans session | 401 live |
| Register sans auth | 401 live |
| JWT `alg:none` / confusion `typ` | 401 |
| Multi-tenant 404 | `getAccessibleEventOrThrow` + tests S-03 |
| CSRF mutations cookie | `csrfValid` timing-safe |
| MFA admin + anti-replay compteur | `consumeMfaCounter` |
| Stripe matérialisation | session liée, prix, `payment_status=paid`, idempotence |
| Tokens hashés | SHA-256, 256 bits |
| Metrics prod sans token | 404 |
| CORS origine étrangère | pas d’ACAO |

---

## 5. Matrice freeloader (sans compte / sans payer)

| Attaque | Résultat |
|---|---|
| Self-signup admin | Bloqué |
| Google compte inconnu | `needsSignup`, pas de compte |
| Checkout forcé | Stripe off → 400 |
| Webhook fake | Non configuré / signature |
| Org-invite sans token | 400 |
| API events/team/orgs | 401 |
| UI forgée localStorage | Désormais bloquée après hydrate (post-patch) |
| Credential stuffing | Mitigé en code ; **Redis prod requis** pour multi-instance |

**Seul free path intentionnel :** invitation super-admin (ou bootstrap).

---

## 6. Chaînes d’attaque

### AC-F1 — Credential stuffing

```text
Entrée     : POST /api/admin/auth/login
Faiblesse  : PW-05 (MemoryStore × N)
Étapes     : stuffing multi-replica → MDP faible/fuité → session
             (attaché sans MFA = impact direct)
Impact     : tenant, PII, exports
Rupture    : Redis partagé + clé email+IP (patch A) + MFA étendue
```

### AC-J1 — Persistance journaliste post-reset

```text
Entrée     : cookie jspace ou MDP
Faiblesse  : F-01
Étapes     : victime reset → JWT 30j reste valide (avant patch)
Impact     : export RGPD, demandes
Rupture    : password_changed_at (patch B) + migrate
```

### AC-J2 — Rejeu magic link

```text
Entrée     : email d’acceptation
Faiblesse  : F-02
Étapes     : rejouer bearer URL avant / en plus de la session
Rupture    : rotation premier hit (patch C)
```

### AC-I1 — Free org via platform

```text
Entrée     : super-admin / ADMIN_* / lien invite
Faiblesse  : PW-02 + secrets ops
Impact     : org active gratuite
Rupture    : MFA platform, vider ADMIN_*, audit grants
```

---

## 7. Correctifs livrés dans le dépôt

### Fichiers modifiés / ajoutés

```text
client/src/admin/auth/AuthContext.tsx
client/src/admin/auth/ProtectedRoute.tsx
client/src/admin/auth/AcceptInvitePage.tsx
client/src/admin/auth/InviteSignupPage.tsx
server/src/lib/rateLimitStore.ts
server/src/lib/jwt.ts
server/src/routes/admin/auth.ts
server/src/routes/public/space.ts
server/src/db/repositories/journalistRepo.ts
server/src/domain.ts
server/src/index.ts
server/migrations/1700000000053_journalist-password-changed-at.ts
server/test/auth-rate-limit-key.test.ts
server/test/journalist-session-revocation.test.ts
(+ fixtures tests existants)
```

### Lots

| Lot | Findings | Contenu |
|---|---|---|
| **A** | PW-05 | Rate-limit auth fail-closed + clé IP+email |
| **B** | F-01 | `password_changed_at` journaliste + contrôle JWT |
| **C** | F-02 | Rotation magic link au premier hit API |
| **E** | PW-06, PW-07 | Hydrate `/me` + mdp min 12 client |

### Non appliqué

| Item | Raison |
|---|---|
| PW-02 `billing_source` | Produit / migration métier |
| Exécution migration 0053 sur DB distante | À lancer par l’ops avant deploy |
| Redis prod | Configuration cloud |
| Rotation secrets exposés | Ops manuelle |

### Tests automatisés

```text
npm test (server) → 36 fichiers, 181 tests, 100 % pass
tsc --noEmit → OK
```

Nouveaux tests ciblés : clés rate-limit, fail-closed store, révocation `iat` / `password_changed_at`, JWT jspace.

---

## 8. Procédure de mise en production

### Immédiat

1. **Rotation** des secrets éventuellement exposés (JWT, MDP admin, encryption, secret Google si `GOCSPX` fuité).
2. Vider `ADMIN_EMAIL` / `ADMIN_PASSWORD` après bootstrap.
3. Brancher **Redis** + `REQUIRE_REDIS=true` en multi-instance.
4. Déployer le code + exécuter :

```bash
cd server && npm run migrate:up
```

5. Vérifier MFA active sur le compte platform admin.

### Revalidation post-deploy

```bash
BASE=https://<host>

# Rate-limit : attendre 429
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "$i %{http_code}\n" -X POST "$BASE/api/admin/auth/login" \
    -H 'content-type: application/json' \
    -d '{"email":"reval@example.com","password":"WrongPassword1!"}'
done

# Freeloader
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/admin/events"   # 401
curl -s "$BASE/api/admin/billing/config"                               # billingEnabled

# Journaliste (manuel)
# reset MDP → ancien Cookie pr360_jspace → GET /api/public/space/me = 401

# Magic link (manuel)
# POST /session avec raw → OK ; second POST même raw → 404
```

| Scénario | Résultat attendu post-patch |
|---|---|
| 12 logins multi-replica (avec Redis) | 429 après quota global |
| Reset MDP journaliste | Ancienne session 401 |
| Magic link rejoué | Refusé |
| localStorage fake admin | Redirect login après hydrate |
| Freeloader self-signup | Toujours bloqué |

---

## 9. Détection et monitoring

| Signal | Action |
|---|---|
| Boot prod sans `REDIS_URL` | Log `[security]` → alerte ops |
| Log `fail-closed (auth)` / `fail-open` Redis | Pager si récurrent |
| Burst 401 login sans jamais 429 | Vérifier Redis / replicas |
| Création d’orgs sans `stripe_subscription_id` | Revue grants super-admin |
| `ADMIN_*` encore en env | Purge immédiate |

**Indicateurs de compromission (IOC) :**

- Login admin depuis pays inhabituel + MFA absente
- Explosion d’orgs sans abonnement Stripe
- Burst login sans 429
- Exports CSV en masse hors horaires

---

## 10. Roadmap résiduelle

| Horizon | Actions |
|---|---|
| **0–24 h** | Secrets, Redis, migrate 0053, deploy, MFA platform |
| **1–7 j** | Revalidation §8, lockout par email en base (optionnel), alerte grants |
| **1–4 sem.** | `billing_source` (PW-02), step-up MFA exports, rotation atomique magic link (race) |
| **1–3 mois** | DAST staging, session store `jti` admin, chaos Redis down |

---

## 11. Rollback

```bash
# Annuler le lot non commité
git checkout -- client/src/admin/auth server/src server/test
git clean -fd server/migrations/1700000000053_journalist-password-changed-at.ts \
  server/test/auth-rate-limit-key.test.ts \
  server/test/journalist-session-revocation.test.ts

# Si migration déjà appliquée
cd server && npm run migrate:down
```

---

## 12. Conclusion

| Question | Réponse |
|---|---|
| L’app est-elle « insecure » ? | **Non** — fondations solides |
| Un anonyme peut-il s’offrir le SaaS sans payer ? | **Non** (Stripe off + pas de self-signup) |
| Un attaquant peut-il s’acharner sur le login ? | **Oui plus facilement sans Redis** — patch code prêt, ops Redis critique |
| Sessions journaliste post-reset ? | **Corrigé en code** (migrate obligatoire) |
| Magic links rejouables ? | **Corrigé** (rotation premier hit) |
| Cosplay UI admin ? | **Corrigé** (hydrate `/me`) |
| Prêt prod après ce lot ? | **Oui après** migrate + Redis multi-instance + rotation secrets si fuite |

PR Event 360 est un SaaS **bien défendu au niveau applicatif**, avec un historique de durcissement visible (tests pentest, docs sécurité). Les risques restants sont surtout **opérationnels (Redis, secrets, migration)** et **métier (grants gratuits super-admin)**.

---

## Annexe A — Progression des passes d’audit

```text
- Surface couverte : auth admin/journaliste/production, billing/paywall, multi-tenant,
  MFA, reset, invites, rate-limit, JWT, CORS, SEO public, freeloader
- Fichiers analysés : middleware/auth, rateLimitStore, jwt, session, billingService,
  orgInvite, invitation, journalist*, space, production, AuthContext, ProtectedRoute
- Endpoints analysés : /api/admin/*, /api/public/*, /api/stripe/webhook, /api/metrics, /api/health
- Findings confirmés : F-01, F-02, PW-02, PW-05, PW-06, PW-07 (+ infos)
- Chaînes : AC-F1, AC-J1, AC-J2, AC-I1
- Correctifs : lots A, B, C, E appliqués localement
- Tests : 181/181 verts
```

## Annexe B — Sondes freeloader (échantillon live)

| Requête | Résultat observé |
|---|---|
| `GET /api/health` | 200 ok |
| `GET /api/admin/billing/config` | `billingEnabled: false` |
| `POST /api/admin/billing/checkout` | 400 paiement non configuré |
| `GET /api/admin/events` | 401 |
| `POST /api/admin/auth/register` | 401 |
| `POST /api/admin/auth/org-invite/accept` (token fake) | 400 |
| `POST /api/stripe/webhook` (sig fake) | 400 webhook non configuré |
| Burst login (avant Redis) | 401 répétés, remaining non monotone |
| CORS `Origin: evil` | pas d’ACAO |
| `GET /api/metrics` | 404 sans token |

---

*Fin du rapport — 2026-08-05. Document généré dans le cadre de l’audit offensif autorisé du dépôt PR Event 360.*
