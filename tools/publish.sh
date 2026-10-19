#!/bin/sh
# Publishes the app: copies the app files from main to gh-pages, stamps the build
# (the short main commit and its date) into the BUILD constant in index.html, and removes
# the comments from the published index.html (tools/strip-comments.js, from main too).
#
# Usage: tools/publish.sh [--dry-run] [message]
#   message    added to the commit, for example "0.6.35: the build shows in Settings".
#   --dry-run  show the commit and the stamped line, then discard them. Nothing is pushed.
#
# Run it from a clean checkout. It publishes origin/main, not your working tree.
set -eu

push=yes
if [ "${1:-}" = "--dry-run" ]; then push=no; shift; fi
message=${1:-}

root=$(git rev-parse --show-toplevel)
cd "$root"
git fetch -q origin main gh-pages

commit=$(git rev-parse --short origin/main)
date=$(git log -1 --format=%cs origin/main)
files="index.html manifest.webmanifest sw.js icons .nojekyll"

work=$(mktemp -d)
trap 'git worktree remove --force "$work" >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
git worktree add -q --detach "$work" origin/gh-pages

for f in $files; do
  rm -rf "$work/$f"
  git archive origin/main "$f" | tar -x -C "$work"
done

placeholder="const BUILD = Object.freeze({ commit: 'dev', date: '' });"
stamp="const BUILD = Object.freeze({ commit: '$commit', date: '$date' });"
if [ "$(grep -cxF "$placeholder" "$work/index.html")" != 1 ]; then
  echo "publish: index.html must hold this line exactly once: $placeholder" >&2
  exit 1
fi
sed -i.bak "s/^const BUILD = Object.freeze({ commit: 'dev', date: '' });\$/$stamp/" "$work/index.html"
rm -f "$work/index.html.bak"

# The published page carries no comments. The source on main keeps them.
git show origin/main:tools/strip-comments.js > "$work/.strip-comments.js"
node "$work/.strip-comments.js" "$work/index.html"
rm -f "$work/.strip-comments.js"

cd "$work"
git add -A -- $files
if git diff --cached --quiet; then
  echo "publish: gh-pages already has main $commit."
  exit 0
fi
subject="Publish${message:+ ${message%%:*}} (main $commit)"
case $message in *:*) subject="$subject:${message#*:}" ;; esac
git commit -q -m "$subject"
echo "publish: $(git log -1 --format='%h %s')"

if [ "$push" = yes ]; then
  git push origin HEAD:gh-pages
else
  git show --stat --format= HEAD
  grep -xF "$stamp" index.html
  echo "publish: dry run; nothing pushed."
fi
