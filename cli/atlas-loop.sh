#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_DIR="$ROOT_DIR/docs/prompts"

usage() {
  cat <<'USAGE'
Usage: atlas-loop {ideas|content|optimize|crit|loop}

Commands:
  ideas      Generate directions and angles
  content    Turn a goal into content
  optimize   Improve a draft
  crit       Review a draft
  loop       Analyze feedback and repeat signals
USAGE
}

show_prompt() {
  local name="$1"
  local file="$PROMPT_DIR/$name.md"

  if [[ ! -f "$file" ]]; then
    echo "Missing prompt: $file" >&2
    exit 1
  fi

  echo "Running $name..."
  echo
  sed -n '1,200p' "$file"
}

case "${1:-}" in
  ideas)
    show_prompt "ideas"
    ;;
  content)
    show_prompt "content"
    ;;
  optimize)
    show_prompt "optimize"
    ;;
  crit)
    show_prompt "crit"
    ;;
  loop | analyze)
    show_prompt "loop"
    ;;
  *)
    usage
    ;;
esac
