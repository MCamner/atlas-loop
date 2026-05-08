#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_DIR="$ROOT_DIR/docs/prompts"

usage() {
  cat <<'USAGE'
Usage: atlas-loop {ideas|content|optimize|crit|loop}
       atlas-loop {ideas|content|optimize|crit|loop} "your input"
       echo "your input" | atlas-loop {ideas|content|optimize|crit|loop}

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
  local input="${2:-}"
  local file="$PROMPT_DIR/$name.md"

  if [[ ! -f "$file" ]]; then
    echo "Missing prompt: $file" >&2
    exit 1
  fi

  echo "Running $name..."
  echo

  if [[ -z "$input" && ! -t 0 ]]; then
    input="$(cat)"
  fi

  if [[ -n "$input" ]]; then
    INPUT="$input" perl -0pe 's/\[INPUT\]/$ENV{INPUT}/g' "$file"
  else
    sed -n '1,200p' "$file"
  fi
}

command="${1:-}"

if [[ $# -gt 0 ]]; then
  shift
fi

input="${*:-}"

case "$command" in
  ideas)
    show_prompt "ideas" "$input"
    ;;
  content)
    show_prompt "content" "$input"
    ;;
  optimize)
    show_prompt "optimize" "$input"
    ;;
  crit)
    show_prompt "crit" "$input"
    ;;
  loop | analyze)
    show_prompt "loop" "$input"
    ;;
  *)
    usage
    ;;
esac
