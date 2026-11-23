<p align="center">
  <img src="appmobile/src/assets/pet-dog.png" alt="Logo Find'N'Tag" width="120"/>
</p>

<h1 align="center">🐾 Find'N'Tag</h1>

<p align="center">
  <strong>Identification et suivi d'animaux par NFC, GPS et carte d'identité nationale</strong><br/>
  <em>Projet académique réalisé en binôme — Master en Ingénierie des Systèmes Intelligents</em><br/>
  <em>Faculté des Sciences Aïn Chock, Casablanca</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React%20Native-0.79-61DAFB?logo=react&logoColor=white" alt="React Native"/>
  <img src="https://img.shields.io/badge/Expo-SDK%2053-000020?logo=expo&logoColor=white" alt="Expo"/>
  <img src="https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F?logo=springboot&logoColor=white" alt="Spring Boot"/>
  <img src="https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white" alt="Java 17"/>
  <img src="https://img.shields.io/badge/database-PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/OCR-Flask%20%2B%20EasyOCR-000000?logo=flask&logoColor=white" alt="Flask"/>
  <img src="https://img.shields.io/badge/IoT-MQTT-660066?logo=mqtt&logoColor=white" alt="MQTT"/>
  <img src="https://img.shields.io/badge/NFC-NTAG213-0A66C2" alt="NFC"/>
</p>

---

## 📋 Présentation

Find'N'Tag regroupe une application mobile, une API REST et des services IoT. Il permet d'**identifier** un animal grâce à un tag NFC, de **suivre sa position** avec un traceur GPS et de **gérer sa propriété** entre utilisateurs identifiés par leur carte d'identité nationale (CIN). Une personne qui retrouve un animal scanne son tag **sans compte**, et même hors ligne, pour appeler le propriétaire.

### Fonctionnalités Clés

| Fonctionnalité | Description |
|---|---|
| 🏷️ **Identification NFC** | Le tag ne contient qu'un identifiant opaque, le nom de l'animal et le téléphone du propriétaire. Il se lit **sans compte** et sans internet. |
| 🪪 **Connexion sans mot de passe** | Photo de la CIN lue par OCR (numéro et ligne MRZ), puis code à 6 chiffres envoyé par email |
| 📍 **Suivi GPS** | Le traceur A9G publie ses positions en MQTT ; historique conservé **30 jours** (purge chaque nuit à 3 h 30) |
| 🗺️ **Zone autorisée** | Polygone dessiné sur la carte ; alerte envoyée **au moment de la sortie** de la zone |
| 🔁 **Vente** | Transfert de propriété d'une CIN à une autre (CIN de l'acheteur lue par OCR), avec historique ; le tag est réécrit avec le nouveau téléphone |
| 🐶 **Gestion des animaux** | Ajout avec photo, modification, suppression, liste, compteur |
| 👤 **Compte** | Profil ; suppression refusée tant que l'utilisateur possède des animaux |

---

## 🏗️ Architecture

```text
┌──────────────┐   MQTT    ┌───────────────────┐
│ Traceur A9G  │──────────►│  Broker MQTT      │  gps_tracker/<deviceId>/location
└──────────────┘           └─────────┬─────────┘
                                     │
                         ┌───────────▼────────────┐
                         │  Pont MQTT → HTTP      │  mon_projet_mrz/mqtt_to_http_bridge.py
                         │  (Python)              │
                         └───────────┬────────────┘
                                     │ POST /api/gps/ingest (en-tête X-Device-Key)
┌────────────────────────┐           ▼
│  Application mobile    │  HTTP  ┌──────────────────────────┐     ┌──────────────┐
│  React Native (Expo)   │◄──────►│  Backend Spring Boot     │◄───►│  PostgreSQL  │
│                        │  JWT   │  :8081                   │     │  :5432       │
│  • NFC (tags NDEF)     │        └──┬─────────┬──────────┬──┘     └──────────────┘
│  • Appareil photo      │           │         │          │
│  • Carte Leaflet       │           ▼         ▼          ▼
│  • Notifications       │   ┌────────────┐ ┌──────┐ ┌─────────────────────┐
└────────────────────────┘   │ Service OCR│ │ SMTP │ │ Expo Push           │
                             │ Flask :5001│ │(OTP) │ │ (alertes de zone)   │
                             │ (local)    │ └──────┘ └─────────────────────┘
                             └────────────┘
```

### Technologies Utilisées

| Couche | Technologie |
|---|---|
| Application mobile | React Native 0.79, Expo SDK 53 (dev-client), React Navigation 7, react-native-nfc-manager, Leaflet dans une WebView, NativeWind, Axios, expo-notifications |
| API | Java 17, Spring Boot 3.4.5 (Web, Security, Data JPA, Validation, Mail, Actuator), JJWT, Lombok |
| Base de données | PostgreSQL |
| OCR | Python 3.10+, Flask, Waitress, EasyOCR, OpenCV |
| IoT | Traceur GPS A9G, MQTT (paho-mqtt), broker HiveMQ public par défaut |
| Tests | JUnit 5, Spring Boot Test et H2 (backend), `node --test` (mobile), `unittest` (Python) |

---

## 📁 Structure du Projet

```text
FindNTag/
├── appmobile/                     # Application Android (React Native / Expo)
│   ├── App.js, app.json, eas.json
│   ├── src/
│   │   ├── api/                   # Client HTTP unique (Axios) et modules par domaine
│   │   ├── auth/                  # Stockage du jeton
│   │   ├── context/               # Utilisateur connecté
│   │   ├── navigation/            # Pile et onglets
│   │   ├── nfc/                   # Format du tag, lecture, écriture, effacement
│   │   ├── map/                   # Page Leaflet
│   │   ├── notifications/         # Jeton push
│   │   └── screens/               # Écrans
│   └── tests/                     # Tests du module NFC
│
├── backend/                       # API REST (Spring Boot)
│   └── src/main/java/com/IOTprojet/backend/
│       ├── controller/            # Routes REST et gestion des erreurs
│       ├── service/               # Animaux, GPS, zones, OTP, OCR, email, push, fichiers
│       ├── security/              # JWT et utilisateur courant
│       ├── repository/            # Accès à la base
│       ├── entity/                # Entités JPA
│       ├── dto/                   # Objets échangés avec l'application
│       └── config/                # Sécurité, CORS, fichiers statiques, initialisation
│
├── mon_projet_mrz/                # Services Python
│   ├── app.py                     # Service OCR (Flask + EasyOCR)
│   ├── ocr_parser.py              # Extraction CIN, nom et prénom
│   ├── mqtt_to_http_bridge.py     # Pont MQTT → backend
│   └── tests/
│
└── README.md
```

---

## 📦 Matériel et Logiciels Requis

| Composant | Modèle / Détail | Usage |
|---|---|---|
| Téléphone | **Android avec NFC** | Lecture et écriture des tags. **Expo Go ne fonctionne pas** : il faut un *dev-client*. |
| Tags NFC | NTAG213 ou plus | Un tag par animal (moins de 100 octets écrits) |
| Traceur GPS | A9G (GPS + GPRS) | Envoi des positions en MQTT |
| JDK | 17 | Backend (Maven est fourni : `./mvnw`) |
| PostgreSQL | 14 ou plus | Base de données |
| Python | 3.10 ou plus | Service OCR et pont MQTT |
| Node.js | 20 ou plus | Application mobile |
| Compte Gmail | « Mot de passe d'application » | Envoi des codes de vérification |
| Android Studio (SDK 35) ou compte Expo (EAS) | — | Construire le dev-client |
| `mosquitto-clients` | Facultatif | Simuler le traceur GPS |

---

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/oumaimadamiri/FindNTag.git
cd FindNTag
```

### 2. Créer la base de données

```bash
sudo -u postgres psql -c "CREATE USER animal;"
sudo -u postgres psql -c "\password animal"
sudo -u postgres psql -c "CREATE DATABASE animaltracking OWNER animal;"
```

### 3. Configurer les fichiers d'environnement

Trois fichiers, **jamais commités**, chacun avec son modèle `.env.example`. Générez chaque secret avec `openssl rand -hex 32`, avec une valeur différente pour `JWT_SECRET` et pour `GPS_INGEST_KEY`. Le backend **refuse de démarrer** si l'une des deux manque.

<details>
<summary><strong><code>backend/.env</code></strong></summary>

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

La durée de conservation GPS se règle avec `app.gps.retention-days` (30 par défaut) ou `APP_GPS_RETENTION_DAYS`.
</details>

<details>
<summary><strong><code>mon_projet_mrz/.env</code></strong></summary>

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
| `GPS_INGEST_KEY` | | **Identique** à celle de `backend/.env` |
</details>

<details>
<summary><strong><code>appmobile/.env.local</code></strong></summary>

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Adresse du **backend**, port **8081** (pas celui de Metro, 8082). En Wi-Fi : `http://<IP du PC>:8081` (`hostname -I`). En USB, après `adb reverse tcp:8081 tcp:8081` : `http://localhost:8081`. |
</details>

### 4. Lancer le service OCR

Au premier lancement, les modèles sont téléchargés (environ 100 Mo).

```bash
cd mon_projet_mrz
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
cp .env.example .env            # puis renseigner GPS_INGEST_KEY
python app.py
```

### 5. Lancer le backend (autre terminal)

```bash
cd backend
cp .env.example .env            # puis remplir
./mvnw spring-boot:run          # à lancer depuis backend/ (lecture du .env)
```

Les tables sont créées ou mises à jour au démarrage. Le profil `dev` (`--spring.profiles.active=dev`) affiche les requêtes SQL.

### 6. Lancer le pont MQTT (autre terminal, facultatif)

```bash
cd mon_projet_mrz && source .venv/bin/activate
python mqtt_to_http_bridge.py
```

### 7. Construire le dev-client et lancer l'application

Le NFC est un module natif : il faut installer un *dev-client* sur le téléphone. Il se construit **une fois**, puis à nouveau à chaque ajout d'un module natif.
- **Dans le cloud (EAS)** : `npx eas-cli login`, puis `npx eas-cli build -p android --profile development`
- **En local** : Android Studio (SDK 35), puis `npx expo run:android --port 8082`

```bash
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

---

## 🔄 Fonctionnement

### Inscription et connexion
```text
Photo de la CIN → OCR (numéro + ligne MRZ) → vérification et correction des champs
  → Email + téléphone → code à 6 chiffres reçu par email → jeton JWT
```

### Animal retrouvé (sans compte)
```text
Scan du tag NFC depuis l'écran d'accueil
  → Nom de l'animal + téléphone du propriétaire affichés tout de suite (même hors ligne)
  → En ligne : photo et race récupérées par l'API → bouton « Appeler le propriétaire »
```

### Sortie de zone
```text
Traceur A9G → MQTT → pont → POST /api/gps/ingest → position enregistrée
  ├─ ✅ Dans la zone    → rien à signaler
  └─ ⚠️ Sortie de zone  → notification push envoyée au propriétaire
```

### Vente
```text
Photo de la CIN de l'acheteur → OCR → validation
  → Propriété transférée (historique enregistré)
  → Tag NFC réécrit avec le téléphone du nouveau propriétaire
```

Pour simuler le traceur sans matériel (le `deviceId` est le nom saisi dans l'application) :
```bash
mosquitto_pub -h broker.hivemq.com -t gps_tracker/a9g/location -m '{"latitude":33.5731,"longitude":-7.5898}'
```

---

## 📱 Écrans

| Écran | Description |
|---|---|
| **Accueil / Scanner** | Lecture d'un tag sans compte, fiche de l'animal, appel du propriétaire |
| **Inscription / Connexion** | Photo de la CIN, code reçu par email |
| **Ajouter un animal** | Enregistrement avec photo, puis écriture du tag NFC |
| **Mes animaux** | Liste, modification, suppression ; réécriture des anciens tags (format v1) |
| **Carte** | Position, historique, zone autorisée, association du traceur |
| **Vendre** | Lecture de la CIN de l'acheteur et transfert de propriété |
| **Mon compte** | Profil et suppression du compte |

---

## 🏷️ Format du Tag NFC (v2)

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

---

## 🔌 API REST

Toutes les erreurs sont renvoyées en JSON : `{"message": "..."}`.

### Routes publiques
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/auth/register` | Inscription (multipart : photo de la CIN, email, téléphone, cin, nom, prénom) |
| POST | `/api/auth/request-otp` | Envoi d'un code par email (`{cin}`) |
| POST | `/api/auth/verify-otp` | Vérification du code (`{cin, code}`), renvoie `{token, user}` |
| POST | `/api/ocr/cin` | Lecture d'une CIN : renvoie `{cin, nom, prenom}` |
| GET | `/api/public/animals/{publicId}` | Fiche publique d'un animal scanné |
| GET | `/api/animals/photo/{tagId}` | Photo d'un animal (anciens tags) |
| GET | `/uploads/**` | Fichiers téléversés |
| GET | `/actuator/health` | État du service |

### Route d'équipement
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/gps/ingest` | Réception d'une position (en-tête `X-Device-Key`) |

### Routes authentifiées (`Authorization: Bearer <jeton>`)
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/users/me` | Profil de l'utilisateur connecté |
| GET | `/api/users/{cin}` | Profil (uniquement le sien) |
| GET | `/api/users/lookup/{cin}` | Infos minimales d'un acheteur (vente) |
| PUT | `/api/users/me/push-token` | Jeton de notification Expo |
| DELETE | `/api/users/me`, `/api/users/{id}` | Suppression de son compte |
| GET | `/api/animals/user/{cin}` · `/count/by-user/{cin}` | Liste et nombre de ses animaux |
| GET | `/api/animals/{id}` · `/tag/{tagId}` · `/by-public-id/{publicId}` | Détail d'un de ses animaux |
| POST | `/api/animals` | Création |
| PUT | `/api/animals/{id}` | Modification |
| DELETE | `/api/animals/{id}` | Suppression (positions, zone, traceur et historique compris) |
| POST | `/api/animals/{id}/transfer` | Vente à un autre utilisateur |
| POST | `/api/animals/upload-file` | Téléversement d'une photo |
| GET | `/api/animals/{id}/positions` | Historique GPS |
| GET / PUT | `/api/animals/{id}/geofence` | Zone autorisée |
| GET / PUT / DELETE | `/api/animals/{id}/tracker` | Traceur associé |
| GET | `/api/gps/{animalId}` | Dernière position |

Un utilisateur n'accède qu'à **ses propres** animaux, zones, traceurs et positions. Sinon, l'API répond 403.

---

## 🗄️ Schéma de la Base de Données

| Table | Description |
|---|---|
| `users` | Utilisateur : CIN, nom, prénom, email, téléphone, jeton de notification |
| `animal` | Animal : nom, race, âge, photo, identifiant du tag, identifiant public, propriétaire |
| `tracker` | Traceur GPS associé à un animal (`deviceId`, dernière activité) |
| `gps_position` | Positions reçues (latitude, longitude, date), conservées 30 jours |
| `geofence` | Zone autorisée d'un animal (polygone), dernier état dedans / dehors |
| `animal_transfers` | Historique des ventes (CIN du vendeur, CIN de l'acheteur, date) |

---

## 🔐 Sécurité

- **Authentification** par jeton JWT (7 jours par défaut), délivré après vérification d'un code envoyé par email. Le code :
  - fait 6 chiffres aléatoires et est **haché** (BCrypt) ;
  - reste valable 10 minutes et accepte **5 essais** au maximum ;
  - n'est utilisable qu'une fois et ne peut être renvoyé qu'une fois par minute.
- **Contrôle d'accès côté serveur** sur chaque ressource : animal, zone, traceur, positions.
- **API sans état** : pas de session, CSRF désactivé, CORS limité aux origines configurées.
- **Clé d'équipement** (`X-Device-Key`) pour l'ingestion GPS.
- **Photos vérifiées sur leur contenu** (JPEG, PNG, GIF, WebP), et non sur leur extension ; 10 Mo maximum.
- **Service OCR** accessible uniquement en local (`127.0.0.1`).
- **Aucun secret dans le code** : tout passe par les fichiers `.env`.
- **Données minimales** sur le tag NFC et dans la fiche publique (prénom et téléphone uniquement).
- **Supervision** : seul `/actuator/health` est exposé.

---

## ⚠️ Limites Connues

Ces points ont été identifiés et **ne sont pas traités**. Il faudrait les corriger avant toute mise en production.

### Identité et authentification

**L'inscription ne prouve pas l'identité.**
- Le numéro de CIN, le nom et le prénom envoyés par l'application sont acceptés tels quels.
- Le serveur ne compare pas la CIN saisie à celle de la photo.
- L'email n'est pas vérifié avant la création du compte.

Quelqu'un peut donc inscrire la CIN d'une autre personne avec son propre email. La vraie personne ne peut alors plus s'inscrire (409).

*Piste :* appliquer l'OCR côté serveur à chaque inscription et n'activer le compte qu'après vérification de l'email. Une vraie preuve d'identité demanderait une vérification KYC.

**Les jetons.**
- **Le jeton n'est pas révocable** pendant ses 7 jours de validité.
- **Le jeton est stocké dans AsyncStorage**, qui n'est pas chiffré. `src/auth/tokenStorage.js` centralise cet accès pour pouvoir passer à `expo-secure-store`.

### Abus et disponibilité
- **Aucune limite de débit par IP.** Sont concernés :
  - `POST /api/ocr/cin`, qui est public et coûteux en CPU ;
  - `POST /api/auth/register` et `/request-otp` ;
  - les routes `/api/public/**`.
- **Énumération des comptes possible** via :
  - `request-otp`, qui répond 404 et renvoie l'email masqué ;
  - `register`, qui répond 409 ;
  - `/api/users/lookup/{cin}`.

### Infrastructure
- **Codes OTP stockés en mémoire** : ils sont perdus au redémarrage et ne fonctionnent pas avec plusieurs instances. *Piste :* table en base ou Redis.
- **Schéma de base géré par Hibernate** (`ddl-auto=update`) et `open-in-view` activé. *Piste :* Flyway ou Liquibase, `ddl-auto=validate`.
- **Broker MQTT public** par défaut : n'importe qui peut publier une fausse position. Pour un usage réel, il faut un broker privé avec TLS.

### Fonctionnel et qualité
- **Notifications avec l'application fermée** : elles demandent un projet Firebase, qui n'est pas configuré.
- **Pas d'hystérésis sur la zone** : un GPS imprécis au bord de la zone peut déclencher plusieurs alertes.
- **Pas de lint ni d'intégration continue**, et pas de tests d'écran ni de bout en bout côté mobile.

---

## 🧪 Tests

```bash
cd backend && ./mvnw test                                       # 60 tests (H2 en mémoire, ni base ni SMTP nécessaires)
cd appmobile && npm test                                        # 10 tests du module NFC
cd mon_projet_mrz && python3 -m unittest discover -s tests     # 11 tests du lecteur de CIN
```

Ils couvrent :
- la connexion : code, expiration, nombre d'essais, rejeu ;
- les jetons falsifiés ou expirés ;
- les droits d'accès sur toutes les routes ;
- la gestion et la vente des animaux ;
- le suivi GPS et les alertes de zone ;
- le format du tag NFC et la lecture de la CIN.

---

## 🛠️ Dépannage

| Symptôme | Cause probable |
|---|---|
| Le backend s'arrête sur `SCRAM-based authentication, but no password` | `backend/.env` absent ou `DB_PASSWORD` vide. Lancer `./mvnw` **depuis `backend/`**. |
| `Could not resolve placeholder 'app.jwt.secret'` | `JWT_SECRET` ou `GPS_INGEST_KEY` manque dans `backend/.env` |
| L'OCR ne remplit rien, sans erreur | `EXPO_PUBLIC_API_URL` pointe vers Metro (8082) au lieu du backend (8081). Relancer Metro avec `--clear`. |
| `Service OCR indisponible` (502) | Le service Flask n'est pas lancé, ou `OCR_API_URL` est incorrect |
| Erreur 401 partout | Jeton expiré, ou `JWT_SECRET` modifié depuis la dernière connexion |
| `Veuillez patienter … s` (429) | Un nouveau code ne peut être demandé qu'une fois par minute |
| Le pont MQTT reçoit `404` | Aucun animal n'est associé à ce `deviceId` (puce « Traceur » sur la carte) |
| Le pont MQTT reçoit `401` | `GPS_INGEST_KEY` différente entre `mon_projet_mrz/.env` et `backend/.env` |
| `Unable to resolve module` | Nouveau fichier non détecté : `npx expo start --clear` |
| `cleartext HTTP` bloqué | Utiliser le dev-client (HTTP autorisé en debug) ou `adb reverse` |
| Le NFC ne réagit pas | Application lancée dans Expo Go au lieu du dev-client, ou NFC désactivé |

---

## Auteurs

| Nom | Rôle |
|---|---|
| **Oumaima Damiri** | Développeuse Full-Stack & IoT |
| **Jihane EL Berkaoui** | Développeuse Full-Stack |

**Superviseur :** Pr. Errais Mohammed Amine

---

<p align="center">
Faculté des Sciences Aïn Chock, Casablanca
</p>
