"""Orquestador del pipeline.

    uv run python run.py              # todos los pasos
    uv run python run.py --desde 02   # reanudar desde un paso
    uv run python run.py --solo 05    # un único paso
"""

from __future__ import annotations

import argparse
import importlib
import time

from obs.steps import ORDEN
from obs.utils import get_logger

log = get_logger("pipeline")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--desde")
    ap.add_argument("--solo")
    args = ap.parse_args()

    pasos = ORDEN
    if args.solo:
        pasos = [p for p in ORDEN if p.startswith(f"s{args.solo.zfill(2)}")]
    elif args.desde:
        pasos = ORDEN[next(i for i, p in enumerate(ORDEN) if p.startswith(f"s{args.desde.zfill(2)}")):]

    t0 = time.perf_counter()
    for paso in pasos:
        t = time.perf_counter()
        log.info(f"▶ {paso}")
        importlib.import_module(f"obs.steps.{paso}").run()
        log.info(f"✓ {paso} · {time.perf_counter() - t:.1f}s")
    log.info(f"pipeline completo · {time.perf_counter() - t0:.1f}s")


if __name__ == "__main__":
    main()
