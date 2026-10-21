"""Utilidades compartidas: logging, normalización de texto, E/S."""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from pathlib import Path

import pandas as pd

_FMT = logging.Formatter("%(asctime)s %(levelname)-5s %(name)s · %(message)s", "%H:%M:%S")


def get_logger(name: str) -> logging.Logger:
    log = logging.getLogger(f"obs.{name}")
    if not log.handlers:
        h = logging.StreamHandler()
        h.setFormatter(_FMT)
        log.addHandler(h)
        log.setLevel(logging.INFO)
        log.propagate = False
    return log


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def norm_col(c: object) -> str:
    """'*AGRUPA EDAD  PERSONA ' → 'AGRUPA_EDAD_PERSONA'."""
    s = strip_accents(str(c)).upper().replace("*", " ")
    s = re.sub(r"[^A-Z0-9]+", "_", s)
    return s.strip("_")


def norm_key(s: object) -> str:
    """Clave de comparación: mayúsculas, sin tildes, espacios simples."""
    return re.sub(r"\s+", " ", strip_accents(str(s)).upper()).strip()


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", strip_accents(s).lower()).strip("-")


def year_from_name(name: str) -> int | None:
    m = re.search(r"(20[12]\d)", name)
    return int(m.group(1)) if m else None


def write_json(path: Path, data, *, pretty: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    kw = {"indent": 2} if pretty else {"separators": (",", ":")}
    path.write_text(json.dumps(data, ensure_ascii=False, default=_json_default, **kw), encoding="utf-8")


def _json_default(o):
    if isinstance(o, (pd.Timestamp,)):
        return o.strftime("%Y-%m-%d")
    if hasattr(o, "item"):
        return o.item()
    if pd.isna(o):
        return None
    return str(o)


def records(df: pd.DataFrame, round_to: int = 4) -> list[dict]:
    """DataFrame → lista de dicts lista para JSON (NaN → null, floats redondeados)."""
    out = df.copy()
    for c in out.select_dtypes("float").columns:
        out[c] = out[c].round(round_to)
    return json.loads(out.to_json(orient="records", force_ascii=False, date_format="iso"))
