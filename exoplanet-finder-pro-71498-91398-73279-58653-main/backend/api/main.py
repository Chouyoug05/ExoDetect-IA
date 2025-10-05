from __future__ import annotations

import io
import json
import logging
from typing import Any, Dict, List, Optional, Tuple
import csv
import math
import os
import time
import hmac
import hashlib
import base64

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel
from src.dataset_adapter import adapt_to_canonical, detect_dataset_type
from src.preprocessing import apply_inference_preprocessing, compute_preprocessor_config
from src.train_model import train_model as train_model_kepler
from src.train_model_k2 import train_model_k2


logger = logging.getLogger("exodetect.api")
logging.basicConfig(level=logging.INFO)


def _load_models() -> Tuple[Optional[Any], Optional[Any], Optional[Dict[str, Any]]]:
    base_dir = Path(__file__).resolve().parents[1]  # .../backend
    models_dir = base_dir / "models"
    model_path = models_dir / "model.joblib"
    model_k2_path = models_dir / "model_k2.joblib"
    preproc_path = models_dir / "preprocessor_config.json"
    try:
        model = joblib.load(str(model_path))
        logger.info("Model loaded: %s", model_path)
    except Exception as e:
        logger.warning("Model not loaded: %s", e)
        model = None

    try:
        model_k2 = joblib.load(str(model_k2_path))
        logger.info("Model K2 loaded: %s", model_k2_path)
    except Exception as e:
        logger.warning("Model K2 not loaded: %s", e)
        model_k2 = None

    preproc_cfg: Optional[Dict[str, Any]] = None
    try:
        with open(preproc_path, "r", encoding="utf-8") as f:
            preproc_cfg = json.load(f)
        logger.info("Preprocessor config loaded")
    except Exception as e:
        logger.warning("Preprocessor config not loaded: %s", e)

    return model, model_k2, preproc_cfg


def _read_uploaded_csv(file_bytes: bytes) -> pd.DataFrame:
    # Nettoyage basique: supprimer les null bytes qui cassent certains parseurs
    if b"\x00" in file_bytes:
        file_bytes = file_bytes.replace(b"\x00", b"")

    # Tentative 0: Sniffer pour détecter séparateur/quotechar
    try:
        sample_txt = file_bytes[:10000].decode("utf-8", errors="ignore")
        dialect = csv.Sniffer().sniff(sample_txt, delimiters=[",", ";", "\t", "|"])
        sniff_sep = getattr(dialect, "delimiter", None) or ","
        sniff_quote = getattr(dialect, "quotechar", '"')
        return pd.read_csv(
            io.BytesIO(file_bytes),
            comment="#",
            sep=sniff_sep,
            engine="python",
            on_bad_lines="skip",
            quotechar=sniff_quote,
            header=0,
        )
    except Exception:
        pass

    # Try bytes -> pandas with various strategies
    # Strategy 1: direct bytes with pandas (fast path)
    try:
        # sep=None -> inference du séparateur ("," ";" etc.) via l'engine python
        return pd.read_csv(
            io.BytesIO(file_bytes),
            comment="#",
            sep=None,
            engine="python",
            on_bad_lines="skip",
            header=0,
        )
    except Exception:
        pass

    # Strategy 2: decode as UTF-8
    try:
        return pd.read_csv(
            io.StringIO(file_bytes.decode("utf-8", errors="ignore")),
            comment="#",
            sep=None,
            engine="python",
            on_bad_lines="skip",
            header=0,
        )
    except Exception:
        pass

    # Strategy 3: decode as latin-1
    try:
        return pd.read_csv(
            io.StringIO(file_bytes.decode("latin-1", errors="ignore")),
            comment="#",
            sep=None,
            engine="python",
            on_bad_lines="skip",
            header=0,
        )
    except Exception:
        pass

    # Strategy 4: delimiter fallback over common separators
    for sep in [",", ";", "\t", "|"]:
        try:
            return pd.read_csv(
                io.StringIO(file_bytes.decode("utf-8", errors="ignore")),
                comment="#",
                sep=sep,
                engine="python",
                on_bad_lines="skip",
                header=0,
            )
        except Exception:
            continue

    # Strategy 5: ignorer tout quoting (données très mal quotées)
    for sep in [",", ";", "\t", "|"]:
        try:
            return pd.read_csv(
                io.StringIO(file_bytes.decode("utf-8", errors="ignore")),
                comment="#",
                sep=sep,
                engine="python",
                on_bad_lines="skip",
                quoting=csv.QUOTE_NONE,
                escapechar="\\",
                header=0,
            )
        except Exception:
            continue

    # Strategy 6: essayer d'autres encodages courants (UTF-8-SIG, UTF-16 variants)
    for enc in ["utf-8-sig", "utf-16", "utf-16le", "utf-16be"]:
        for sep in [None, ",", ";", "\t", "|"]:
            try:
                return pd.read_csv(
                    io.StringIO(file_bytes.decode(enc, errors="ignore")),
                    comment="#",
                    sep=sep,
                    engine="python",
                    on_bad_lines="skip",
                    header=0,
                )
            except Exception:
                continue

    # Strategy 7: fallback whitespace-delimited
    try:
        return pd.read_csv(
            io.StringIO(file_bytes.decode("utf-8", errors="ignore")),
            comment="#",
            delim_whitespace=True,
            engine="python",
            on_bad_lines="skip",
            header=0,
        )
    except Exception:
        pass

    raise HTTPException(status_code=400, detail="CSV invalide: impossible de parser le contenu (séparateur/quotage)")


def _extract_time_flux(df: pd.DataFrame) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    time_candidates = [
        "time",
        "TIME",
        "Time",
        "t",
        "jd",
        "bjd",
        "BJD",
        "HJD",
    ]
    flux_candidates = [
        "flux",
        "FLUX",
        "Flux",
        "pdcsap_flux",
        "sap_flux",
        "flux_norm",
    ]

    def first_present(cands: List[str]) -> Optional[str]:
        for c in cands:
            if c in df.columns:
                return c
        # Try lowercase-insensitive match
        lower_map = {c.lower(): c for c in df.columns}
        for c in cands:
            if c.lower() in lower_map:
                return lower_map[c.lower()]
        return None

    t_col = first_present(time_candidates)
    f_col = first_present(flux_candidates)

    time_values: Optional[np.ndarray] = None
    flux_values: Optional[np.ndarray] = None

    if t_col is not None:
        try:
            time_values = pd.to_numeric(df[t_col], errors="coerce").dropna().to_numpy()
        except Exception:
            time_values = None

    if f_col is not None:
        try:
            flux_values = pd.to_numeric(df[f_col], errors="coerce").dropna().to_numpy()
        except Exception:
            flux_values = None

    if time_values is not None and flux_values is not None:
        n = min(len(time_values), len(flux_values), 3000)
        time_values = time_values[:n]
        flux_values = flux_values[:n]

    return time_values, flux_values


def _simple_classification(time_values: Optional[np.ndarray], flux_values: Optional[np.ndarray]) -> Tuple[str, float]:
    if flux_values is None or len(flux_values) == 0:
        return "Candidat", 0.5

    # Very naive heuristic: variance-based pseudo-confidence
    variance = float(np.var(flux_values)) if len(flux_values) > 1 else 0.0
    # Map variance to [0.4, 0.95]
    confidence = 0.4 + (min(variance, 0.05) / 0.05) * 0.55
    status = "Exoplanète" if confidence > 0.75 else ("Candidat" if confidence > 0.5 else "Faux positif")
    return status, round(confidence, 4)


app = FastAPI(title="ExoDetect AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MODEL_KEPLER, MODEL_K2, PREPROC_CFG_KEPLER = _load_models()

KEPLER_FEATURES: List[str] = [
    "koi_period",
    "koi_duration",
    "koi_depth",
    "koi_prad",
]

K2_FEATURES: List[str] = [
    "koi_period",
    "koi_prad",
]


def _build_config_for_features(source_df: pd.DataFrame, base_cfg: Optional[Dict[str, Any]], features: List[str]) -> Dict[str, Any]:
    # If base config has stats for desired features, subset it
    if base_cfg and "stats" in base_cfg:
        stats = base_cfg.get("stats", {})
        if all(f in stats for f in features):
            return {"features": features, "stats": {f: stats[f] for f in features}}
    # Otherwise compute on the fly from current data
    try:
        return compute_preprocessor_config(source_df, features)
    except Exception:
        # Fallback: synthetic generic stats to avoid failure
        synth_stats: Dict[str, Any] = {}
        for f in features:
            col = pd.to_numeric(source_df.get(f, pd.Series(dtype=float)), errors="coerce")
            col = col.dropna()
            if not col.empty:
                q01 = float(col.quantile(0.01))
                q99 = float(col.quantile(0.99))
                synth_stats[f] = {
                    "median": float(col.median()),
                    "min": float(col.min()),
                    "max": float(col.max()),
                    "clip_min": q01,
                    "clip_max": q99,
                }
            else:
                synth_stats[f] = {
                    "median": 0.0,
                    "min": 0.0,
                    "max": 1.0,
                    "clip_min": 0.0,
                    "clip_max": 1.0,
                }
        return {"features": features, "stats": synth_stats}


def _prepare_features(canonical_df: pd.DataFrame, features: List[str], base_cfg: Optional[Dict[str, Any]]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    cfg = _build_config_for_features(canonical_df, base_cfg, features)
    feats_df, info = apply_inference_preprocessing(canonical_df, cfg)
    # If everything dropped out, create a single filled row using medians
    if feats_df.empty:
        row: Dict[str, float] = {}
        stats = cfg.get("stats", {})
        for f in features:
            row[f] = float(stats.get(f, {}).get("median", 0.0))
        feats_df = pd.DataFrame([row], columns=features)
        info = {**info, "rows_out": 1, "note": "filled_with_medians"}
    return feats_df, info


def _build_feature_explanation(
    features_df: pd.DataFrame,
    features: List[str],
    base_cfg: Optional[Dict[str, Any]],
    model_obj: Optional[Any],
) -> Dict[str, Any]:
    explanation: Dict[str, Any] = {"top_features": []}

    # Feature importances when available (e.g., RandomForest)
    importances: Optional[List[float]] = None
    if hasattr(model_obj, "feature_importances_"):
        try:
            importances = list(getattr(model_obj, "feature_importances_"))
        except Exception:
            importances = None

    # Compute normalized deltas vs median from preprocessing stats
    deltas: Dict[str, float] = {}
    if base_cfg and "stats" in base_cfg:
        stats = base_cfg.get("stats", {})
        means = features_df[features].mean(numeric_only=True)
        for i, f in enumerate(features):
            median = float(stats.get(f, {}).get("median", 0.0))
            clip_min = float(stats.get(f, {}).get("clip_min", 1.0))
            clip_max = float(stats.get(f, {}).get("clip_max", 1.0))
            rng = max(clip_max - clip_min, 1e-9)
            val = float(means.get(f, median))
            deltas[f] = (val - median) / rng

    # Aggregate contributions = |delta| * importance (if available), else |delta|
    contributions: List[Tuple[str, float, float]] = []  # (feature, contrib, signed_delta)
    for i, f in enumerate(features):
        delta = deltas.get(f, 0.0)
        weight = importances[i] if (importances is not None and i < len(importances)) else 1.0
        contributions.append((f, abs(delta) * float(weight), delta))

    # Top 3 features by contribution
    contributions.sort(key=lambda x: x[1], reverse=True)
    top = contributions[:3]
    for f, contrib, delta in top:
        direction = "au-dessus" if delta > 0 else ("en-dessous" if delta < 0 else "proche de")
        explanation["top_features"].append({
            "feature": f,
            "influence": round(contrib, 4),
            "direction": direction,
        })

    return explanation


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> Dict[str, Any]:
    # Log des métadonnées du fichier pour diagnostic
    logger.info("/predict received file: name=%s content_type=%s", getattr(file, 'filename', None), getattr(file, 'content_type', None))

    try:
        content = await file.read()
        logger.info("/predict file size: %s bytes", len(content) if content else 0)
        if not content:
            raise HTTPException(status_code=400, detail="Fichier vide")
    except Exception as e:
        logger.exception("/predict read error")
        raise HTTPException(status_code=400, detail=f"Lecture du fichier impossible: {e}")

    # Only CSV supported in this baseline endpoint
    try:
        raw_df = _read_uploaded_csv(content)
    except HTTPException:
        # If CSV parsing failed, return a graceful default classification without chart
        status, confidence = _simple_classification(None, None)
        return {
            "result": {
                "status": status,
                "confidence": confidence,
            }
        }

    # Extract possible chart data for UI
    time_values, flux_values = _extract_time_flux(raw_df)

    # Adapt uploaded dataset to canonical features
    canonical_df = adapt_to_canonical(raw_df)

    # Prepare features for Kepler model
    try:
        features_df, info = _prepare_features(canonical_df, KEPLER_FEATURES, PREPROC_CFG_KEPLER)
    except Exception as e:
        logger.warning("Kepler preprocessing failed: %s", e)
        features_df, info = None, {}

    # Use model if available; fallback to heuristic otherwise
    if MODEL_KEPLER is not None and features_df is not None and not features_df.empty:
        try:
            proba = MODEL_KEPLER.predict_proba(features_df)  # shape (n, 3)
            pred = MODEL_KEPLER.predict(features_df)
            # Agréger sur tout le fichier: moyenne des probas
            mean_proba = proba.mean(axis=0)
            # Map predicted label (int) to name
            # Labels: -1 FP, 0 CANDIDATE, 1 CONFIRMED (selon train_model.py)
            label_order = [-1, 0, 1]
            label_to_index = {lbl: idx for idx, lbl in enumerate(label_order)}
            # Choix par proba moyenne
            best_idx = int(mean_proba.argmax())
            best_label = label_order[best_idx]
            confidence = float(mean_proba[best_idx])

            if best_label == 1:
                status = "Exoplanète"
            elif best_label == 0:
                status = "Candidat"
            else:
                status = "Faux positif"

            explanation = _build_feature_explanation(features_df, KEPLER_FEATURES, PREPROC_CFG_KEPLER, MODEL_KEPLER)
            response: Dict[str, Any] = {
                "result": {
                    "status": status,
                    "confidence": round(confidence, 4),
                },
                "model": "kepler",
                "explanation": explanation,
            }
        except Exception as e:
            logger.error("Model inference failed: %s", e)
            status, confidence = _simple_classification(time_values, flux_values)
            response = {
                "result": {
                    "status": status,
                    "confidence": confidence,
                },
                "model": "heuristic",
                "explanation": {"method": "flux_variance"},
            }
    else:
        status, confidence = _simple_classification(time_values, flux_values)
        response = {
            "result": {
                "status": status,
                "confidence": confidence,
            },
            "model": "heuristic",
            "explanation": {"method": "flux_variance"},
        }

    if time_values is not None and flux_values is not None and len(time_values) > 0 and len(flux_values) > 0:
        response["chart"] = {
            "time": [float(x) for x in time_values.tolist()],
            "flux": [float(x) for x in flux_values.tolist()],
        }
    if info:
        response["preprocessing"] = info

    return response
@app.post("/admin/train/kepler")
async def admin_train_kepler(file: UploadFile = File(...)) -> Dict[str, Any]:
    base_dir = Path(__file__).resolve().parents[1]
    models_dir = base_dir / "models"
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Fichier vide")
        tmp_csv = models_dir / "_tmp_train_kepler.csv"
        models_dir.mkdir(parents=True, exist_ok=True)
        tmp_csv.write_bytes(content)
        metrics = train_model_kepler(
            cleaned_csv=str(tmp_csv),
            model_path=str(models_dir / "model.joblib"),
            metrics_path=str(models_dir / "metrics.json"),
            preproc_path=str(models_dir / "preprocessor_config.json"),
        )
        return {"status": "ok", "metrics": metrics}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Training Kepler failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/train/k2")
async def admin_train_k2(file: UploadFile = File(...)) -> Dict[str, Any]:
    base_dir = Path(__file__).resolve().parents[1]
    models_dir = base_dir / "models"
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Fichier vide")
        tmp_csv = models_dir / "_tmp_train_k2.csv"
        models_dir.mkdir(parents=True, exist_ok=True)
        tmp_csv.write_bytes(content)
        metrics = train_model_k2(
            cleaned_csv=str(tmp_csv),
            model_path=str(models_dir / "model_k2.joblib"),
            metrics_path=str(models_dir / "metrics_k2.json"),
        )
        return {"status": "ok", "metrics": metrics}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Training K2 failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict-k2")
async def predict_k2(file: UploadFile = File(...)) -> Dict[str, Any]:
    # Pour compat avec jeux K2/NEA (souvent avec # en commentaires, autres alias)
    logger.info("/predict-k2 received file: name=%s content_type=%s", getattr(file, 'filename', None), getattr(file, 'content_type', None))

    try:
        content = await file.read()
        logger.info("/predict-k2 file size: %s bytes", len(content) if content else 0)
        if not content:
            raise HTTPException(status_code=400, detail="Fichier vide")
    except Exception as e:
        logger.exception("/predict-k2 read error")
        raise HTTPException(status_code=400, detail=f"Lecture du fichier impossible: {e}")

    try:
        raw_df = _read_uploaded_csv(content)
    except HTTPException:
        status, confidence = _simple_classification(None, None)
        return {
            "result": {
                "status": status,
                "confidence": confidence,
            }
        }

    time_values, flux_values = _extract_time_flux(raw_df)
    canonical_df = adapt_to_canonical(raw_df)

    features_df = None
    info: Dict[str, Any] = {}
    try:
        features_df, info = _prepare_features(canonical_df, K2_FEATURES, PREPROC_CFG_KEPLER)
    except Exception as e:
        logger.warning("K2 preprocessing failed: %s", e)
        features_df, info = None, {}

    if MODEL_K2 is not None and features_df is not None and not features_df.empty:
        try:
            proba = MODEL_K2.predict_proba(features_df)
            mean_proba = proba.mean(axis=0)
            label_order = [-1, 0, 1]
            best_idx = int(mean_proba.argmax())
            best_label = label_order[best_idx]
            confidence = float(mean_proba[best_idx])

            if best_label == 1:
                status = "Exoplanète"
            elif best_label == 0:
                status = "Candidat"
            else:
                status = "Faux positif"

            explanation = _build_feature_explanation(features_df, K2_FEATURES, PREPROC_CFG_KEPLER, MODEL_K2)
            response: Dict[str, Any] = {
                "result": {
                    "status": status,
                    "confidence": round(confidence, 4),
                },
                "model": "k2",
                "explanation": explanation,
            }
        except Exception as e:
            logger.error("Model inference failed: %s", e)
            status, confidence = _simple_classification(time_values, flux_values)
            response = {
                "result": {
                    "status": status,
                    "confidence": confidence,
                },
                "model": "heuristic",
                "explanation": {"method": "flux_variance"},
            }
    else:
        status, confidence = _simple_classification(time_values, flux_values)
        response = {
            "result": {
                "status": status,
                "confidence": confidence,
            },
            "model": "heuristic",
            "explanation": {"method": "flux_variance"},
        }

    if time_values is not None and flux_values is not None and len(time_values) > 0 and len(flux_values) > 0:
        response["chart"] = {
            "time": [float(x) for x in time_values.tolist()],
            "flux": [float(x) for x in flux_values.tolist()],
        }
    if info:
        response["preprocessing"] = info

    return response



T_SUN = 5778.0  # K
R_SUN_M = 6.957e8  # m
M_SUN_KG = 1.98847e30  # kg
G_SI = 6.67430e-11  # m^3 kg^-1 s^-2
AU_M = 1.495978707e11  # m
L_SUN_W = 3.828e26  # W
R_EARTH_M = 6.371e6  # m
M_EARTH_KG = 5.972e24  # kg
M_JUPITER_KG = 1.898e27  # kg


class PlanetIn(BaseModel):
    pl_name: Optional[str] = None
    st_teff: Optional[float] = None
    st_rad: Optional[float] = None  # R_sun
    st_mass: Optional[float] = None  # M_sun
    pl_orbper: Optional[float] = None  # days
    pl_rade: Optional[float] = None  # Earth radii
    pl_eqt: Optional[float] = None  # K
    pl_insol: Optional[float] = None


def _safe_float(x: Any) -> Optional[float]:
    try:
        if x is None or (isinstance(x, float) and pd.isna(x)):
            return None
        return float(x)
    except Exception:
        return None


def _compute_habitability_for_row(row: Dict[str, Any]) -> Dict[str, Any]:
    name = row.get("pl_name") or row.get("name") or "Non disponible"
    T_star = _safe_float(row.get("st_teff"))
    R_star_rsun = _safe_float(row.get("st_rad"))
    M_star_msun = _safe_float(row.get("st_mass"))
    P_days = _safe_float(row.get("pl_orbper"))
    R_p_re = _safe_float(row.get("pl_rade"))
    # Optional masses if available in some datasets
    M_p_earth = _safe_float(row.get("pl_bmasse"))  # Earth masses
    M_p_jup = _safe_float(row.get("pl_bmassj")) or _safe_float(row.get("pl_massj"))  # Jupiter masses
    T_eq = _safe_float(row.get("pl_eqt"))
    # Distances
    dist_pc = _safe_float(row.get("st_dist")) or _safe_float(row.get("sy_dist"))

    a_au: Optional[float] = None
    if M_star_msun is not None and P_days is not None:
        try:
            a_m = ((G_SI * (M_star_msun * M_SUN_KG) * (P_days * 86400.0) ** 2) / (4.0 * math.pi ** 2)) ** (1.0 / 3.0)
            a_au = a_m / AU_M
        except Exception:
            a_au = None

    L_rel: Optional[float] = None
    if R_star_rsun is not None and T_star is not None:
        try:
            L_rel = (R_star_rsun ** 2.0) * ((T_star / T_SUN) ** 4.0)
        except Exception:
            L_rel = None

    hz_inner = None
    hz_outer = None
    in_hab_zone = None
    if L_rel is not None:
        try:
            hz_inner = math.sqrt(L_rel / 1.1)
            hz_outer = math.sqrt(L_rel / 0.53)
            if a_au is not None:
                in_hab_zone = (a_au >= hz_inner and a_au <= hz_outer)
        except Exception:
            pass

    if T_eq is None and T_star is not None and R_star_rsun is not None and a_au is not None:
        try:
            R_star_m = R_star_rsun * R_SUN_M
            a_m = a_au * AU_M
            T_eq = T_star * math.sqrt(R_star_m / (2.0 * a_m)) * ((1.0 - 0.3) ** 0.25)
        except Exception:
            T_eq = None

    # Planet gravity if mass and radius available
    gravity = None
    try:
        if R_p_re is not None:
            R_p_m = R_p_re * R_EARTH_M
            if M_p_earth is not None:
                M_p_kg = M_p_earth * M_EARTH_KG
                gravity = G_SI * M_p_kg / (R_p_m ** 2)
            elif M_p_jup is not None:
                M_p_kg = M_p_jup * M_JUPITER_KG
                gravity = G_SI * M_p_kg / (R_p_m ** 2)
    except Exception:
        gravity = None

    # Stellar irradiance at planet orbit
    luminosity_w_m2 = None
    try:
        if L_rel is not None and a_au is not None:
            a_m = a_au * AU_M
            luminosity_w_m2 = L_rel * L_SUN_W / (4.0 * math.pi * (a_m ** 2))
    except Exception:
        luminosity_w_m2 = None

    # Star class from temperature
    star_class = None
    if T_star is not None:
        try:
            if T_star >= 30000:
                star_class = "O"
            elif T_star >= 10000:
                star_class = "B"
            elif T_star >= 7500:
                star_class = "A"
            elif T_star >= 6000:
                star_class = "F"
            elif T_star >= 5200:
                star_class = "G"
            elif T_star >= 3700:
                star_class = "K"
            else:
                star_class = "M"
        except Exception:
            star_class = None

    # Earth Similarity Index (simplified: radius, gravity, temp)
    def _sub_esi(x: Optional[float], x_ref: float) -> Optional[float]:
        if x is None or x <= 0 or x_ref <= 0:
            return None
        try:
            v = 1.0 - abs(x - x_ref) / (x + x_ref)
            return max(0.0, min(1.0, v))
        except Exception:
            return None

    esi_parts: List[float] = []
    r_esi = _sub_esi(R_p_re, 1.0)
    if r_esi is not None:
        esi_parts.append(r_esi)
    g_esi = _sub_esi(gravity / 9.81 if (gravity is not None and gravity > 0) else None, 1.0)
    if g_esi is not None:
        esi_parts.append(g_esi)
    t_esi = _sub_esi(T_eq, 288.0)
    if t_esi is not None:
        esi_parts.append(t_esi)
    esi = None
    if esi_parts:
        try:
            prod = 1.0
            for p in esi_parts:
                prod *= p
            esi = prod ** (1.0 / len(esi_parts))
        except Exception:
            esi = None

    score = 0.0
    if T_eq is not None and 0.0 <= T_eq <= 373.0:
        score += 0.4
    if R_p_re is not None and R_p_re <= 2.0:
        score += 0.3
    if in_hab_zone is True:
        score += 0.2
    if T_star is not None and 4000.0 <= T_star <= 6000.0:
        score += 0.1

    # Summary sentence
    try:
        status_phrase = "dans la zone habitable" if in_hab_zone else "en dehors de la zone habitable"
        temp_txt = f"{int(round(T_eq))} K" if T_eq is not None else "température inconnue"
        rad_txt = f"{R_p_re:.1f}x Terre" if R_p_re is not None else "rayon inconnu"
        summary = (
            f"{name} est située {status_phrase}, avec une température de {temp_txt}, "
            f"un rayon {rad_txt} et un score d’habitabilité de {round(score, 2):.2f}."
        )
    except Exception:
        summary = None

    return {
        "name": name,
        "radius": R_p_re if R_p_re is not None else None,
        "temp_eq": T_eq if T_eq is not None else None,
        "zone_habitable": bool(in_hab_zone) if in_hab_zone is not None else False,
        "habitability_score": round(score, 4),
        "gravity_m_s2": gravity if gravity is not None else None,
        "luminosity_w_m2": luminosity_w_m2 if luminosity_w_m2 is not None else None,
        "esi": round(esi, 4) if esi is not None else None,
        "star_class": star_class,
        "distance_pc": dist_pc if dist_pc is not None else None,
        "distance_ly": (dist_pc * 3.26156) if dist_pc is not None else None,
        "summary": summary,
    }


@app.post("/habitability")
async def habitability(
    file: Optional[UploadFile] = File(None),
    planets: Optional[List[PlanetIn]] = Body(None),
) -> Dict[str, Any]:
    try:
        rows: List[Dict[str, Any]] = []
        if file is not None:
            content = await file.read()
            if not content:
                raise HTTPException(status_code=400, detail="Fichier vide")
            df = _read_uploaded_csv(content)
            rows = df.to_dict(orient="records")
        elif planets is not None:
            rows = [p.model_dump() for p in planets]
        else:
            raise HTTPException(status_code=400, detail="Aucun fichier ou liste JSON fournie")

        out: List[Dict[str, Any]] = []
        for r in rows:
            out.append(_compute_habitability_for_row(r))

        return {"planets": out}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("/habitability failed")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------- Minimal Auth ----------------------------
AUTH_SECRET = os.environ.get("EXODETECT_AUTH_SECRET", "dev_secret_change_me")
TOKEN_TTL_S = int(os.environ.get("EXODETECT_TOKEN_TTL", "86400"))


def _sign(data: bytes) -> str:
    sig = hmac.new(AUTH_SECRET.encode("utf-8"), data, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")


def create_token(user: str) -> str:
    ts = str(int(time.time())).encode("utf-8")
    payload = f"{user}.{ts.decode()}".encode("utf-8")
    sig = _sign(payload)
    return base64.urlsafe_b64encode(payload).decode("utf-8").rstrip("=") + "." + sig


def verify_token(token: str) -> Optional[str]:
    try:
        b64, sig = token.split(".")
        payload = base64.urlsafe_b64decode(b64 + "==")
        if _sign(payload) != sig:
            return None
        user, ts = payload.decode("utf-8").split(".")
        if time.time() - int(ts) > TOKEN_TTL_S:
            return None
        return user
    except Exception:
        return None


class AuthPayload(BaseModel):
    username: str
    password: str


@app.post("/auth/login")
def auth_login(body: AuthPayload) -> Dict[str, str]:
    # Minimal demo: accepte tout utilisateur non vide; hash réel à mettre en place si besoin
    if not body.username or not body.password:
        raise HTTPException(status_code=400, detail="Identifiants requis")
    token = create_token(body.username)
    return {"token": token}


def require_auth(token: Optional[str] = None) -> str:
    if not token:
        raise HTTPException(status_code=401, detail="Token requis")
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalide/expiré")
    return user


@app.get("/auth/me")
def auth_me(token: Optional[str] = None) -> Dict[str, str]:
    user = require_auth(token)
    return {"user": user}
