#!/usr/bin/env bash
#
# scripts/diagrams.sh — render or syntax-check the PlantUML diagrams under docs/.
#
#   scripts/diagrams.sh [render]   render every docs/**/*.puml to SVG next to its source
#   scripts/diagrams.sh check      syntax-check only; writes no files
#   scripts/diagrams.sh -h|--help  show help
#
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/diagrams.sh [render]   render every docs/**/*.puml to SVG next to its source
  scripts/diagrams.sh check      syntax-check only; writes no files
  scripts/diagrams.sh -h|--help  show this help

Dependencies (install separately; the script exits with an error if missing):
  - Java 17+             to run the PlantUML jar
  - Graphviz (dot)       layout for C4 / UML class diagrams
  - PlantUML             located via, in order:
        $PLANTUML_JAR -> `plantuml` on PATH -> /opt/plantuml/plantuml.jar
EOF
}

MODE="render"
case "${1:-}" in
  ""|render) MODE="render" ;;
  check)     MODE="check" ;;
  -h|--help) usage; exit 0 ;;
  *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- locate PlantUML ---------------------------------------------------------
PLANTUML_CMD=()
NEEDS_JAVA=0
if [[ -n "${PLANTUML_JAR:-}" ]]; then
  if [[ ! -f "$PLANTUML_JAR" ]]; then
    echo "ERROR: PLANTUML_JAR is not a file: $PLANTUML_JAR" >&2
    exit 1
  fi
  PLANTUML_CMD=(java -jar "$PLANTUML_JAR")
  NEEDS_JAVA=1
elif command -v plantuml >/dev/null 2>&1; then
  PLANTUML_CMD=("$(command -v plantuml)")
elif [[ -f /opt/plantuml/plantuml.jar ]]; then
  PLANTUML_CMD=(java -jar /opt/plantuml/plantuml.jar)
  NEEDS_JAVA=1
else
  echo "ERROR: PlantUML not found." >&2
  echo "  Provide it via PLANTUML_JAR=/path/to/plantuml.jar," >&2
  echo "  or install it so that 'plantuml' is on PATH." >&2
  exit 1
fi

# --- check required tools ----------------------------------------------------
if [[ "$NEEDS_JAVA" -eq 1 ]] && ! command -v java >/dev/null 2>&1; then
  echo "ERROR: 'java' not found. Install a JRE/JDK (17+)." >&2
  exit 1
fi
if ! command -v dot >/dev/null 2>&1; then
  echo "ERROR: Graphviz 'dot' not found. Install graphviz." >&2
  exit 1
fi

# --- collect sources ---------------------------------------------------------
mapfile -t FILES < <(find docs -name '*.puml' | sort)
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No .puml files found under docs/."
  exit 0
fi

# --- environment report ------------------------------------------------------
JAVA_BIN="$(command -v java 2>/dev/null || true)"
JAVA_VER="not found"
if [[ -n "$JAVA_BIN" ]]; then
  java_out="$("$JAVA_BIN" -version 2>&1 || true)"
  JAVA_VER="$(printf '%s\n' "$java_out" | head -n1 | sed -E 's/.*version "?([^" ]+)"?.*/\1/')"
  [[ -n "$JAVA_VER" ]] || JAVA_VER="unknown"
fi

plantuml_out="$("${PLANTUML_CMD[@]}" -version 2>&1 || true)"
PLANTUML_VER="$(printf '%s\n' "$plantuml_out" | head -n1 | sed -E 's/^PlantUML version ([^ ]+).*/\1/')"
[[ -n "$PLANTUML_VER" ]] || PLANTUML_VER="unknown"

DOT_BIN="$(command -v dot 2>/dev/null || true)"
dot_out="$("$DOT_BIN" -V 2>&1 || true)"
DOT_VER="$(printf '%s\n' "$dot_out" | sed -E 's/.*version ([^ ]+).*/\1/')"
[[ -n "$DOT_VER" ]] || DOT_VER="unknown"

HAVE_FCLIST=0
CJK_COUNT=0
CJK_NAME=""
if command -v fc-list >/dev/null 2>&1; then
  HAVE_FCLIST=1
  CJK_COUNT="$(fc-list :lang=zh 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$CJK_COUNT" -gt 0 ]]; then
    CJK_NAME="$(fc-list :lang=zh 2>/dev/null | head -n1 | sed -E 's/^[^:]*: //; s/:.*$//')"
  fi
fi

printf 'Environment:\n'
printf '  repo      : %s\n' "$ROOT"
printf '  java      : %s  [%s]\n' "${JAVA_BIN:-not found}" "$JAVA_VER"
printf '  plantuml  : %s  [%s]\n' "${PLANTUML_CMD[*]}" "$PLANTUML_VER"
printf '  graphviz  : %s  [%s]\n' "${DOT_BIN:-not found}" "$DOT_VER"
if [[ "$HAVE_FCLIST" -eq 0 ]]; then
  printf '  cjk font  : n/a (fc-list not available)\n'
elif [[ "$CJK_COUNT" -gt 0 ]]; then
  printf '  cjk font  : yes (%s) - %s\n' "$CJK_COUNT" "$CJK_NAME"
else
  printf '  cjk font  : no (install e.g. fonts-noto-cjk)\n'
fi
printf '  sources   : %s file(s) under docs/\n' "${#FILES[@]}"
printf '\n'

# --- run ---------------------------------------------------------------------
if [[ "$MODE" == "render" ]]; then
  # CJK labels need a CJK-capable font, otherwise PlantUML mis-measures them
  # (each glyph treated as narrow) and the text overlaps.
  if [[ "$HAVE_FCLIST" -eq 1 ]] \
     && LC_ALL=C grep -l '[^ -~]' "${FILES[@]}" >/dev/null 2>&1 \
     && [[ "$CJK_COUNT" -eq 0 ]]; then
    echo "ERROR: no Chinese font found; CJK labels will overlap." >&2
    echo "  Install one, e.g. 'apt-get install -y fonts-noto-cjk'." >&2
    exit 1
  fi

  echo "Rendering SVG next to each source..."
  if "${PLANTUML_CMD[@]}" -tsvg --no-error-image "${FILES[@]}"; then
    echo "Done."
  else
    code=$?
    echo "ERROR: rendering failed (exit $code)." >&2
    exit "$code"
  fi
else
  echo "Checking syntax (no files written)..."
  failed=0
  for f in "${FILES[@]}"; do
    if "${PLANTUML_CMD[@]}" --check-syntax "$f" >/dev/null 2>&1; then
      echo "  ok   $f"
    else
      echo "  FAIL $f"
      failed=$((failed + 1))
      # show line-level detail by rendering just this file to a temp dir
      tmp="$(mktemp -d)"
      "${PLANTUML_CMD[@]}" -tsvg --no-error-image -o "$tmp" "$f" 2>&1 | sed 's/^/       /' || true
      rm -rf "$tmp"
    fi
  done
  if [[ "$failed" -gt 0 ]]; then
    echo "FAILED: $failed of ${#FILES[@]} file(s) have syntax errors." >&2
    exit 1
  fi
  echo "OK: all ${#FILES[@]} file(s) passed."
fi
