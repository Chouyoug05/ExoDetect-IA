# ExoDetect AI - Détection d'exoplanètes par IA

Plateforme web complète (FastAPI + React) pour analyser des données d'observations spatiales (Kepler, K2, TESS), détecter des exoplanètes et visualiser des indicateurs avancés (score d’habitabilité, 3D).

## Fonctionnalités principales

- Upload CSV (Kepler/K2/TESS) avec parsing robuste (séparateur/encodage auto, lignes invalides ignorées)
- Détection IA: Exoplanète / Candidat / Faux positif + confiance + explications (features influentes)
- Habitabilité: T_eq, gravité, insolation (W/m²), ESI, classe stellaire, zone habitable, distance (pc/al), score 0–1 et résumé automatique
- Visualisation 3D (React‑Three‑Fiber + drei): étoile centrale, orbites, planètes colorées par score, tooltip au survol, panneau de détails au clic, légende explicite
- Tableaux/graphes (Analyse avancée) + filtres/tri par score
- Auth minimale (demo open source): /auth/login → token HMAC (TTL configurable)
- UI moderne (shadcn/ui + Tailwind), thème spatial + starfield

## Technologies utilisées

- **Frontend** : React 18 + TypeScript (Vite), TailwindCSS, shadcn/ui
- **Graphiques** : Recharts
- **3D** : three, @react-three/fiber (React 18), @react-three/drei
- **HTTP Client** : axios
- **Backend** : FastAPI, Uvicorn, pandas, numpy, scikit‑learn, joblib

## Prérequis

- Node.js 18+ et npm
- Python 3.11+

## Installation & Lancement (dev)

```bash
# Frontend
npm install
npm run dev  # http://localhost:8080

# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000  # http://localhost:8000
```

Configurez l’URL de l’API côté front via `.env`:

```bash
VITE_API_URL=http://localhost:8000
```

## API Backend (résumé)

### Détection (POST /predict, POST /predict-k2)

Entrée (multipart):
```
file: <votre CSV>
```

Réponse JSON (exemple):
```json
{
  "result": { "status": "Exoplanète", "confidence": 0.93 },
  "chart": { "time": [...], "flux": [...] },
  "model": "kepler|k2",
  "explanation": { "top_features": [...] },
  "preprocessing": { "rows_in": 1000, "rows_out": 980, "dropped_rows": 20 }
}
```

### Habitabilité (POST /habitability)

Entrée: fichier CSV (ou JSON `planets[]`). Sortie:
```
{
  "planets": [
    {
      "name": "Kepler-442b",
      "radius": 1.34,
      "temp_eq": 270,
      "gravity_m_s2": 9.8,
      "luminosity_w_m2": 1370,
      "esi": 0.87,
      "star_class": "K",
      "distance_pc": 110,
      "distance_ly": 358.8,
      "zone_habitable": true,
      "habitability_score": 0.91,
      "summary": "Kepler-442b est située dans la zone habitable..."
    }
  ]
}
```

## Visualisation 3D

- Étoile au centre; anneaux = orbites simulées; planètes colorées par score:
  - 0.0–0.3 rouge • 0.3–0.7 orange • 0.7–1.0 vert
- Survol: tooltip (nom, T_eq, score) • Clic: panneau détaillé (score, rayon, gravité, insolation, classe, distance)
- Contrôles: clic‑droit pivote • molette zoome • glisser déplace

Utilisation:
```jsx
import Exoplanet3DView from '@/components/Exoplanet3DView';
<Exoplanet3DView planets={planetsData} />
```

## Structure du projet

```
src/
├── components/
│   ├── Exoplanet3DView.tsx    # Visualisation 3D
│   ├── ui/                    # Composants UI (shadcn)
│   ├── FileUpload.tsx         # Upload CSV
│   ├── ResultCard.tsx         # Résultats IA
│   ├── LightCurveChart.tsx    # Courbe de lumière
│   └── LoadingSpinner.tsx
├── pages/
│   ├── Index.tsx              # Dashboard + dialogs Habitabilité/3D
│   ├── Advanced.tsx           # Analyse avancée (graphes, table, 3D, glossaire)
│   ├── Login.tsx / Register.tsx / Account.tsx
│   └── NotFound.tsx
├── lib/utils.ts               # Utilitaires (cn, apiUrl)
├── App.tsx                    # Routes
├── main.tsx                   # Entrée React + starfield
└── index.css                  # Thème et styles
```

## Entraînement des modèles (optionnel)

```
# Kepler
curl -X POST "http://localhost:8000/admin/train/kepler" -F "file=@C:/data/kepler_clean.csv"

# K2
curl -X POST "http://localhost:8000/admin/train/k2" -F "file=@C:/data/k2_clean.csv"
```

## Scripts disponibles

```bash
npm run dev        # Lancer le frontend
npm run build      # Construire pour la production (dist/)
npm run preview    # Prévisualiser le build
npm run lint       # Linter le code
```

## Déploiement

- Frontend: `npm run build` puis publier `dist/` (Netlify, Vercel, GitHub Pages via action, etc.)
- Backend: `uvicorn api.main:app --host 0.0.0.0 --port 8000` (ou Gunicorn + Nginx); exposez l’URL publique et réglez `VITE_API_URL` côté front

### Déploiement GitHub (public)

```
git init
git add .
git commit -m "feat: initial public release"
git branch -M main
git remote add origin https://github.com/<votre-compte>/<votre-repo>.git
git push -u origin main
```

## Téléversement de données — format attendu

Colonnes canoniques (ou alias): `koi_period`, `koi_duration`, `koi_depth`, `koi_prad` (alias TESS/NEA: `pl_orbper`, `pl_rade`, etc.). Le backend auto‑détecte le séparateur (`,`, `;`, `\t`) et ignore les lignes `#`.

## Résolution des erreurs courantes

- 400 CSV invalide: vérifiez séparateur/encodage; exporter en CSV standard
- 404 /health: mauvais serveur/port; relancez `uvicorn`
- CORS: le backend autorise `http://localhost:8080` & `:8081`
- 3D vide: relancer une analyse, puis “Analyse avancée” → “Recharger les dernières données”

## Accès réseau local

Backend écoute `0.0.0.0:8000`. Depuis un autre appareil du LAN:
- Base URL API: `http://VOTRE_IP_LAN:8000`
- Front: `VITE_API_URL=http://VOTRE_IP_LAN:8000`

## Missions spatiales supportées

- **Kepler** • **K2** • **TESS**

## Licence

Open Source - MIT License

## Contribution

Les contributions sont les bienvenues ! Ouvrez une issue ou une PR.


## Guide utilisateur (non‑technique)

- Se connecter
  - Ouvrez l’application. Saisissez votre email et mot de passe, puis Se connecter.
  - Si vous n’avez pas de compte: Créer un compte, choisissez un avatar (il s’affichera dans votre profil).

- Analyser un fichier de données
  - Depuis le Tableau de bord, cliquez dans la zone “Téléverser un fichier de données” et sélectionnez un CSV (Kepler/K2/TESS). Patientez quelques secondes.
  - À la fin, un message de succès apparaît et les résultats s’affichent.

- Comprendre les résultats
  - Statut IA: Exoplanète / Candidat / Faux positif.
  - Confiance: de 0 à 1 (plus c’est proche de 1, plus le modèle est confiant).
  - Explication de l’IA: quelles caractéristiques ont le plus influencé la décision (période, rayon, etc.).

- Habitabilité
  - Ouvrez “Voir l’habitabilité”. Vous verrez un tableau avec:
    - Température d’équilibre (K), Rayon (Terre), Gravité (m/s²), Insolation (W/m²), Zone habitable (Oui/Non), Score (0–1).
  - Texte de synthèse: “Sur X exoplanètes analysées, Y sont potentiellement habitables…”.

- Analyse avancée
  - Cliquez “Analyse avancée” pour:
    - Un graphique comparant les meilleurs scores.
    - Un tableau détaillé (classe de l’étoile, distance, ESI…).
    - Une Visualisation 3D (étoile au centre, anneaux = orbites, planètes colorées suivant le score).
    - Légende 3D: code couleur, orbites, contrôles caméra.
    - Astuce: si la page est vide, utilisez “Recharger les dernières données”.

- Visualisation 3D (rappel)
  - Rouge (score faible) → Orange → Vert (score élevé).
  - Survol: affiche Nom, Température, Score.
  - Clic: panneau détaillé avec plus de paramètres.
  - Caméra: clic‑droit pour pivoter, molette pour zoomer, glisser pour déplacer.

- Conseils pour vos fichiers CSV
  - Exportez en CSV standard (UTF‑8). Les lignes commençant par # sont acceptées.
  - Colonnes typiques TESS/NEA: pl_orbper, pl_rade, pl_eqt, st_teff, st_rad, pl_insol, pl_orbsmax, disposition.
  - Si une colonne manque, la plateforme tente un alias ou ignore la ligne.

- Dépannage rapide (utilisateur)
  - “Impossible de se connecter au serveur”: vérifiez que l’API est en ligne.
  - “CSV invalide”: réexportez en CSV simple; évitez les colonnes très hétérogènes ou les séparateurs exotiques.
  - “Rien en 3D”: refaites une analyse, puis “Analyse avancée” → “Recharger les dernières données”.

