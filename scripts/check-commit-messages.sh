#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <base-sha> <head-sha>" >&2
  exit 2
fi

base_sha="$1"
head_sha="$2"
pattern='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: .+'
failed=0

while IFS= read -r subject; do
  if [[ ! "$subject" =~ $pattern ]]; then
    echo "Invalid commit subject: $subject" >&2
    failed=1
  fi
done < <(git log --no-merges --format='%s' "$base_sha..$head_sha")

if [[ -n "${PR_TITLE:-}" && ! "$PR_TITLE" =~ $pattern ]]; then
  echo "Invalid pull request title: $PR_TITLE" >&2
  failed=1
fi

if [[ $failed -ne 0 ]]; then
  echo "Use Conventional Commits, for example: feat(resume): add PDF preview" >&2
  exit 1
fi

echo "Commit subjects and pull request title follow Conventional Commits."
