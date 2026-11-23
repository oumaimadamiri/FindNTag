# FindNTag : identification et suivi d'animaux (NFC, GPS, CIN)

> Projet académique. Application mobile, API REST et services IoT pour **identifier** un animal grâce à un tag NFC, **suivre sa position** avec un traceur GPS, et **gérer sa propriété** entre des utilisateurs identifiés par leur carte d'identité nationale (CIN).

## Sommaire
1. [Fonctionnalités](#fonctionnalités)
2. [Architecture](#architecture)
3. [Stack technique](#stack-technique)
4. [Prérequis](#prérequis)
5. [Configuration](#configuration)
6. [Installation et lancement](#installation-et-lancement)
7. [Utilisation](#utilisation)
8. [Format du tag NFC](#format-du-tag-nfc-v2)
9. [API REST](#api-rest)
10. [Sécurité](#sécurité)
11. [Limites connues et pistes d'amélioration](#limites-connues-et-pistes-damélioration)
12. [Tests](#tests)
13. [Dépannage](#dépannage)
14. [Structure du dépôt](#structure-du-dépôt)

---

## Fonctionnalités

| Domaine | Description |
|---|---|
| **Identification NFC** | Le tag ne contient qu'un identifiant opaque, le nom de l'animal et le téléphone du propriétaire. Une personne qui retrouve l'animal scanne le tag **sans compte** et peut appeler le propriétaire, même sans connexion internet. |
| **Connexion sans mot de passe** | Photo de la CIN, lue par OCR (numéro et ligne MRZ), puis code à 6 chiffres envoyé par email. |
| **Suivi GPS** | Le traceur A9G publie ses positions en MQTT. L'historique est conservé **30 jours** (purge automatique chaque nuit à 3 h 30). |
| **Zone autorisée** | Chaque animal peut avoir un polygone dessiné sur la carte. Une alerte est envoyée **au moment de la sortie** de la zone. |
| **Vente** | Transfert de propriété d'une CIN à une autre (CIN de l'acheteur lue par OCR), avec historique. Le tag est réécrit avec le téléphone du nouveau propriétaire. |
| **Gestion des animaux** | Ajout (avec photo), modification, suppression, liste, compteur. |
| **Compte** | Profil, suppression du compte (refusée tant que l'utilisateur possède des animaux). |

## Architecture

```
 Traceur A9G --MQTT--> broker (gps_tracker/<deviceId>/location)
                              |
                  mon_projet_mrz/mqtt_to_http_bridge.py
                              |  POST /api/gps/ingest  (en-tête X-Device-Key)
                              v
 Application mobile  <--HTTP + JWT-->  Backend Spring Boot :8081  <-->  PostgreSQL :5432
 (React Native / Expo)                    |        |        |
        |                                 |        |        +--> Expo Push (alertes de zone)
        +-- NFC (tags NDEF)               |        +--> SMTP (codes de vérification)
                                          +--> Service OCR Flask :5001 (lecture de la CIN, local uniquement)
```

| Dossier | Rôle |
|---|---|
| `appmobile/` | Application Android : NFC, appareil photo, carte, notifications |
| `backend/` | API REST, authentification, règles métier, base de données |
| `mon_projet_mrz/` | Service OCR de la CIN et pont MQTT vers HTTP pour les positions GPS |

## Stack technique

| Composant | Technologies |
|---|---|
| Mobile | React Native 0.79, Expo SDK 53 (dev-client), React Navigation 7, react-native-nfc-manager, Leaflet dans un WebView, NativeWind, Axios, expo-notifications |
| Backend | Java 17, Spring Boot 3.4.5 (Web, Security, Data JPA, Validation, Mail, Actuator), JJWT, PostgreSQL, Lombok |
| OCR | Python 3.10+, Flask, Waitress, EasyOCR, OpenCV |
| IoT | Traceur GPS A9G, MQTT (paho-mqtt), broker HiveMQ public par défaut |
| Tests | JUnit 5 + Spring Boot Test + H2 (backend), `node --test` (mobile), `unittest` (Python) |

## Prérequis

| Outil | Version | Usage |
|---|---|---|
| JDK | 17 | Backend (Maven est fourni : `./mvnw`) |
| PostgreSQL | 14 ou plus | Base de données |
| Python | 3.10 ou plus | Service OCR et pont MQTT |
| Node.js | 20 ou plus | Application mobile |
| Téléphone **Android avec NFC** | | Tests NFC. **Expo Go ne fonctionne pas** : il faut un *dev-client* ([voir plus bas](#construire-le-dev-client)). |
| Compte Gmail avec « mot de passe d'application » | | Envoi des codes de vérification |
| `mosquitto-clients` | | Facultatif : simuler le traceur GPS |
| Android Studio (SDK 35) ou compte Expo (EAS) | | Construire le dev-client |

## Configuration

Trois fichiers d'environnement, **jamais commités**. Chacun a un modèle `.env.example` à copier.

Générer chaque secret avec `openssl rand -hex 32`, en utilisant une valeur différente pour `JWT_SECRET` et pour `GPS_INGEST_KEY`. Le backend **refuse de démarrer** si l'une des deux manque.

### `backend/.env`

| Variable | Obligatoire | Défaut | Description |
|---|---|---|---|
| `DB_URL` | | `jdbc:postgresql://localhost:5432/animaltracking` | URL JDBC |
| `DB_USER` | | `postgres` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | oui | | Mot de passe PostgreSQL |
| `MAIL_USERNAME` | oui | | Adresse Gmail d'envoi |
| `MAIL_PASSWORD` | oui | | Mot de passe d'application Google |
| `JWT_SECRET` | **oui** | | Clé de signature des jetons (32 caractères minimum) |
| `JWT_TTL_HOURS` | | `168` | Durée de validité d'un jeton (7 jours) |
| `GPS_INGEST_KEY` | **oui** | | Clé partagée avec le pont MQTT |
| `OCR_API_URL` | | `http://localhost:5001/extract_info` | Adresse du service OCR |
| `UPLOAD_DIR` | | `./uploads` | Dossier des photos |
| `CORS_ALLOWED_ORIGINS` | | `http://localhost:8082,http://localhost:19006` | Origines web autorisées |
| `SERVER_PORT` | | `8081` | Port du backend |

La durée de conservation GPS se règle avec la propriété `app.gps.retention-days` (30 par défaut). On peut aussi utiliser la variable `APP_GPS_RETENTION_DAYS`.

### `mon_projet_mrz/.env`

| Variable | Défaut | Description |
|---|---|---|
| `OCR_HOST` | `127.0.0.1` | Interface d'écoute. Garder `127.0.0.1` : seul le backend appelle ce service. |
| `OCR_PORT` | `5001` | Port du service OCR |
| `OCR_GPU` | `false` | `true` pour utiliser CUDA |
| `MQTT_BROKER` | `broker.hivemq.com` | Adresse du broker |
| `MQTT_PORT` | `1883` | `8883` avec TLS |
| `MQTT_TOPIC` | `gps_tracker/+/location` | Un topic par traceur : `gps_tracker/<deviceId>/location` |
| `MQTT_USERNAME`, `MQTT_PASSWORD` | | Pour un broker privé |
| `MQTT_TLS` | `false` | `true` pour un broker privé en TLS |
| `BACKEND_URL` | `http://localhost:8081` | Adresse du backend |
| `GPS_INGEST_KEY` | | **Identique** à celui de `backend/.env` |

### `appmobile/.env.local`

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Adresse du **backend**, port **8081** (pas celui de Metro, 8082). En Wi-Fi : `http://<IP du PC>:8081` (`hostname -I`). En USB, après `adb reverse tcp:8081 tcp:8081` : `http://localhost:8081`. |

## Installation et lancement

```bash
# 1. Base de données
sudo -u postgres psql -c "CREATE USER animal;"
sudo -u postgres psql -c "\password animal"
sudo -u postgres psql -c "CREATE DATABASE animaltracking OWNER animal;"

# 2. Service OCR (premier lancement : téléchargement des modèles, environ 100 Mo)
cd mon_projet_mrz
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
cp .env.example .env            # puis renseigner GPS_INGEST_KEY
python app.py

# 3. Backend (autre terminal). Les tables sont créées ou mises à jour au démarrage.
cd backend
cp .env.example .env            # puis remplir
./mvnw spring-boot:run          # à lancer depuis backend/ (lecture du .env)

# 4. Pont MQTT -> backend (autre terminal, facultatif)
cd mon_projet_mrz && source .venv/bin/activate
python mqtt_to_http_bridge.py

# 5. Application (téléphone branché, débogage USB activé)
cd appmobile
npm install
cp .env.example .env.local      # puis renseigner l'adresse du backend
adb reverse tcp:8082 tcp:8082
npx expo start --dev-client --port 8082 --clear
```

| Service | Port |
|---|---|
| PostgreSQL | 5432 |
| Backend | **8081** |
| Service OCR (local uniquement) | 5001 |
| Metro (Expo) | **8082** (à ne pas confondre avec le backend) |

Au démarrage, le backend attribue un identifiant public aux animaux créés avant l'introduction de ce champ (`PublicIdBackfill`). Le profil `dev` (`--spring.profiles.active=dev`) affiche les requêtes SQL et les logs détaillés.

### Construire le dev-client
Le NFC est un module natif. Il faut installer sur le téléphone un *dev-client*, construit **une fois**, puis à nouveau à chaque ajout d'un module natif.
- **Dans le cloud (EAS)** : `npx eas-cli login`, puis `npx eas-cli build -p android --profile development`. Les profils `preview` et `production` existent aussi dans `eas.json`.
- **En local** : Android Studio (SDK 35), puis `npx expo run:android --port 8082`.

## Utilisation

1. **Inscription** : photo de la CIN, vérification et correction des champs lus, saisie de l'email et du téléphone, puis code reçu par email.
2. **Connexion** : photo de la CIN, puis code reçu par email.
3. **Ajouter un animal** : l'animal est enregistré, puis le tag NFC est écrit (identifiant, nom et téléphone).
4. **Scanner un tag** (écran d'accueil, sans compte) : le nom et le contact s'affichent tout de suite, la photo et la race quand le téléphone est en ligne.
5. **Carte** : choisir l'animal, associer son traceur (puce « Traceur »), dessiner la zone autorisée, consulter l'historique des positions.
6. **Vendre** : photographier la CIN de l'acheteur puis valider. Le tag reçoit le téléphone du nouveau propriétaire.
7. **Anciens tags** (au format v1, qui contenaient la CIN et l'email) : l'écran *Modifier un animal* les relit et les réécrit au nouveau format.

Simuler le traceur sans matériel (le `deviceId` est le nom saisi dans l'application) :
```bash
mosquitto_pub -h broker.hivemq.com -t gps_tracker/a9g/location -m '{"latitude":33.5731,"longitude":-7.5898}'
```

## Format du tag NFC (v2)

Un enregistrement NDEF texte de moins de 100 octets, qui tient sur le plus petit tag NTAG213 :
```json
{"v":2,"id":"123e4567-e89b-12d3-a456-426614174000","n":"Rex","pt":"0600000001"}
```

| Clé | Contenu |
|---|---|
| `v` | Version du format |
| `id` | Identifiant public (UUID) de l'animal |
| `n` | Nom de l'animal |
| `pt` | Téléphone du propriétaire |

Le tag ne contient ni CIN, ni email, ni photo, ni nom de famille. Le reste est récupéré par l'API (`GET /api/public/animals/{id}`).

## API REST

Toutes les erreurs sont renvoyées en JSON : `{"message": "..."}`.

### Routes publiques
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/auth/register` | Inscription (multipart : photo de la CIN, email, téléphone, cin, nom, prénom) |
| POST | `/api/auth/request-otp` | Envoi d'un code par email (`{cin}`) |
| POST | `/api/auth/verify-otp` | Vérification du code (`{cin, code}`), renvoie `{token, user}` |
| POST | `/api/ocr/cin` | Lecture d'une CIN : renvoie `{cin, nom, prenom}` |
| GET | `/api/public/animals/{publicId}` | Fiche publique d'un animal scanné (nom, race, âge, photo, prénom et téléphone du propriétaire) |
| GET | `/api/animals/photo/{tagId}` | Photo d'un animal (anciens tags) |
| GET | `/uploads/**` | Fichiers téléversés |
| GET | `/actuator/health` | État du service |

### Route d'équipement
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/gps/ingest` | Réception d'une position (en-tête `X-Device-Key`, utilisé par le pont MQTT) |

### Routes authentifiées (en-tête `Authorization: Bearer <jeton>`)
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/users/me` | Profil de l'utilisateur connecté |
| GET | `/api/users/{cin}` | Profil (uniquement le sien) |
| GET | `/api/users/lookup/{cin}` | Infos minimales d'un acheteur (vente) |
| PUT | `/api/users/me/push-token` | Enregistrement du jeton de notification Expo |
| DELETE | `/api/users/me`, `/api/users/{id}` | Suppression de son compte |
| GET | `/api/animals/user/{cin}` · `/count/by-user/{cin}` | Liste et nombre de ses animaux |
| GET | `/api/animals/{id}` · `/tag/{tagId}` · `/by-public-id/{publicId}` | Détail d'un de ses animaux |
| POST | `/api/animals` | Création |
| PUT | `/api/animals/{id}` | Modification |
| DELETE | `/api/animals/{id}` | Suppression (positions, zone, traceur et historique de vente compris) |
| POST | `/api/animals/{id}/transfer` | Vente à un autre utilisateur |
| POST | `/api/animals/upload-file` | Téléversement d'une photo |
| GET | `/api/animals/{id}/positions` | Historique GPS |
| GET / PUT | `/api/animals/{id}/geofence` | Zone autorisée |
| GET / PUT / DELETE | `/api/animals/{id}/tracker` | Traceur associé |
| GET | `/api/gps/{animalId}` | Dernière position |

Un utilisateur n'accède qu'à **ses propres** animaux, zones, traceurs et positions. Sinon, l'API répond 403.

## Sécurité

- **Authentification** par jeton JWT (7 jours par défaut), délivré après vérification d'un code envoyé par email. Le code fait 6 chiffres aléatoires, est **haché** (BCrypt), reste valable 10 minutes, accepte **5 essais** au maximum, n'est utilisable qu'une fois et ne peut être renvoyé qu'une fois par minute.
- **Contrôle d'accès côté serveur** sur chaque ressource : propriétaire d'un animal, de sa zone, de son traceur et de ses positions.
- **API sans état** : pas de session, CSRF désactivé, CORS limité aux origines configurées.
- **Clé d'équipement** (`X-Device-Key`) pour l'ingestion GPS.
- **Photos vérifiées sur leur contenu** (JPEG, PNG, GIF, WebP), pas sur leur extension. Taille limitée à 10 Mo.
- **Service OCR** accessible uniquement en local (`127.0.0.1`).
- **Aucun secret dans le code** : tout passe par les fichiers `.env`.
- **Données minimales sur le tag NFC** et dans la fiche publique (prénom et téléphone uniquement).
- **Supervision** : seul `/actuator/health` est exposé.

## Limites connues et pistes d'amélioration

Ce projet a été réalisé dans un cadre académique. Les points suivants ont été identifiés et **ne sont pas traités**. Il faudrait les corriger avant toute mise en production.

### Identité et authentification
- **L'inscription ne prouve pas l'identité.** Le numéro de CIN, le nom et le prénom envoyés par l'application sont acceptés tels quels : l'OCR ne sert qu'à pré-remplir le formulaire, et le serveur ne compare pas la CIN saisie à celle de la photo. L'email n'est pas vérifié avant la création du compte. Quelqu'un peut donc inscrire la CIN d'une autre personne avec son propre email et recevoir les codes de connexion. La vraie personne ne peut alors plus s'inscrire (409).
  *Piste :* appliquer l'OCR côté serveur à chaque inscription, n'activer le compte qu'après vérification de l'email, ne pas bloquer une CIN tant que le compte n'est pas vérifié. Une vraie preuve d'identité demanderait une vérification KYC ou une validation manuelle.
- **Le jeton n'est pas révocable** (7 jours). Un compte supprimé reste « connecté » jusqu'à l'expiration de son jeton, sans pouvoir rien faire.
- **Le jeton est stocké dans AsyncStorage**, qui n'est pas chiffré. `src/auth/tokenStorage.js` centralise cet accès pour pouvoir passer à `expo-secure-store`.

### Abus et disponibilité
- **Aucune limite de débit par IP.** Seules les limites par CIN de l'envoi et de la vérification des codes existent. Sont concernés :
  - `POST /api/ocr/cin` : public, car appelé avant la connexion. Chaque appel lance EasyOCR, ce qui est coûteux en CPU ;
  - `POST /api/auth/register` et `/request-otp` ;
  - la route publique de scan `/api/public/**`.
- **Énumération des comptes** :
  - `request-otp` répond 404 si une CIN n'est pas inscrite et renvoie l'email masqué (`a***@domaine`) ;
  - `register` répond 409 si la CIN existe déjà ;
  - `/api/users/lookup/{cin}` donne à tout utilisateur connecté le nom et le téléphone associés à une CIN.

### Infrastructure
- **Les codes OTP sont stockés en mémoire.** Ils sont perdus au redémarrage et incompatibles avec plusieurs instances du backend. *Piste :* table en base ou Redis.
- **Schéma de base géré par Hibernate** (`ddl-auto=update`), y compris hors développement, et `open-in-view` activé (valeur par défaut). *Piste :* migrations Flyway ou Liquibase, `ddl-auto=validate`, `open-in-view=false` avec des DTO pour les réponses.
- **Le broker MQTT par défaut (`broker.hivemq.com`) est public.** N'importe qui peut publier une fausse position pour un `deviceId` connu. Pour un usage réel, il faut un broker privé (`MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_TLS`) et adapter le firmware du traceur.

### Fonctionnel
- **Les notifications push avec l'application fermée** demandent un projet Firebase et une recompilation. Elles ne sont pas configurées : sans cela, l'alerte de sortie de zone ne s'affiche que quand l'application est ouverte.
- **Pas d'hystérésis sur la zone** : un GPS imprécis au bord de la zone peut déclencher plusieurs alertes.

### Qualité
- **Pas de lint ni d'intégration continue.** `eslint` et `eslint-config-expo` sont installés côté mobile, mais pas configurés. Il n'y a pas de pipeline CI.
- **Pas de tests d'écran ni de bout en bout** côté mobile. Seul le module NFC est testé.

## Tests

```bash
cd backend && ./mvnw test                                        # 60 tests (H2 en mémoire, ni base ni SMTP nécessaires)
cd appmobile && npm test                                         # 10 tests du module NFC
cd mon_projet_mrz && python3 -m unittest discover -s tests      # 11 tests du lecteur de CIN
```

Ils couvrent :
- la connexion : code, expiration, nombre d'essais, rejeu ;
- les jetons falsifiés ou expirés ;
- les droits d'accès sur **toutes** les routes ;
- la création, la modification, la suppression et la vente d'animaux, et les photos ;
- le suivi GPS et les alertes de zone ;
- le format du tag NFC et la lecture de la CIN.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Le backend s'arrête sur `SCRAM-based authentication, but no password` | `backend/.env` absent ou `DB_PASSWORD` vide. Lancer `./mvnw` **depuis `backend/`**. |
| `Could not resolve placeholder 'app.jwt.secret'` | `JWT_SECRET` ou `GPS_INGEST_KEY` manquent dans `backend/.env` |
| L'OCR ne remplit rien, sans erreur | `EXPO_PUBLIC_API_URL` pointe vers le port de Metro (8082) au lieu du backend (8081). Relancer Metro avec `--clear`. |
| `Service OCR indisponible` (502) | Le service Flask n'est pas lancé, ou `OCR_API_URL` est incorrect |
| Erreur 401 partout dans l'application | Jeton expiré : se reconnecter. Autre cause possible : `JWT_SECRET` modifié depuis la dernière connexion. |
| `Veuillez patienter … s` (429) | Un nouveau code ne peut être demandé qu'une fois par minute |
| Le pont MQTT reçoit `404` | Aucun animal n'est associé à ce `deviceId` (puce « Traceur » sur la carte) |
| Le pont MQTT reçoit `401` | `GPS_INGEST_KEY` différent entre `mon_projet_mrz/.env` et `backend/.env` |
| `Unable to resolve module` | Nouveau fichier non détecté : `npx expo start --clear` |
| `cleartext HTTP` bloqué sur le téléphone | Utiliser le dev-client (HTTP autorisé en debug) ou `adb reverse` |
| Le NFC ne réagit pas | Application lancée dans Expo Go au lieu du dev-client, ou NFC désactivé sur le téléphone |

## Structure du dépôt

```
appmobile/
  App.js, app.json, eas.json
  src/
    api/            client HTTP unique (Axios) et modules par domaine
    auth/           stockage du jeton
    context/        utilisateur connecté (connexion / déconnexion)
    navigation/     navigation (pile et onglets)
    nfc/            format du tag, lecture, écriture, effacement
    map/            page Leaflet
    notifications/  jeton push
    screens/        écrans
  tests/            tests du module NFC
backend/src/main/java/com/IOTprojet/backend/
  controller/   routes REST et gestion des erreurs
  service/      logique métier (animaux, GPS, zones, OTP, OCR, email, push, fichiers)
  security/     JWT et utilisateur courant
  repository/   accès à la base
  entity/       entités JPA
  dto/          objets échangés avec l'application
  config/       sécurité, CORS, fichiers statiques, initialisation
mon_projet_mrz/
  app.py                    service OCR (Flask + EasyOCR)
  ocr_parser.py             extraction CIN, nom et prénom
  mqtt_to_http_bridge.py    pont MQTT -> backend
  tests/
```
