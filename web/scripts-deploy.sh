#!/usr/bin/env bash
# Compila el sitio estático y lo publica en la rama gh-pages (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."
BASE=/Estadistica-Delictiva/ pnpm build
cd web/dist
touch .nojekyll   # sin esto GitHub ignora la carpeta _astro/
git init -q -b gh-pages
git add -A
git commit -q -m "Sitio estático $(date +%F)"
git push -f "$(git -C ../.. remote get-url origin)" gh-pages
rm -rf .git
