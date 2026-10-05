#!/usr/bin/env bash
# Run from repo root:
#   bash scripts/commit-and-push-articles.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== status before =="
git status -sb

# Commit 2: openings
git add src/pages/WorkspaceExtras.jsx
if ! git diff --cached --quiet; then
  git commit -m "$(cat <<'EOF'
feat(openings): split petitioner and respondent OA drafts

Keep separate scripts per side with local persistence and a focus mode for full-width editing.
EOF
)"
else
  echo "skip openings (nothing staged)"
fi

# Commit 3: library reader
git add \
  src/lib/pdfTextSearch.js \
  src/lib/pdfTextSearch.test.js \
  src/lib/highlightColors.js \
  src/components/library/AnnotationPanel.jsx \
  src/components/library/AnnotationPanel.test.js \
  src/components/library/PdfViewer.jsx \
  src/components/library/CaseNotesHub.jsx \
  src/components/library/CaseMetaEditor.jsx \
  src/pages/LibraryPage.jsx \
  src/ai/AiUiContext.jsx \
  src/components/facts/CaseAtBarPanel.jsx \
  src/data/casesSeed.js \
  src/lib/sync.js \
  src/lib/sync.test.js
if ! git diff --cached --quiet; then
  git commit -m "$(cat <<'EOF'
feat(library): in-PDF search, highlight colors, stronger notes

Add text-layer find, a shared highlight palette, and denser annotation/notes UX on Instant Case and Case library.
EOF
)"
else
  echo "skip library (nothing staged)"
fi

# Commit 4: ingest fix
git add \
  src/api/client.js \
  src/hooks/useCaseLibrary.js \
  src/components/SyncBanner.jsx
if ! git diff --cached --quiet; then
  git commit -m "$(cat <<'EOF'
fix(ingest): fall back to Blob when proxy ingest dies

Vercel often resets large multipart PDFs as Failed to fetch instead of 413.
Retry via direct Blob ingest, cooldown failed index attempts, and expose Retry Ask AI index.
EOF
)"
else
  echo "skip ingest (nothing staged)"
fi

# Commit 5: articles UI
git add \
  src/pages/ArticlesPage.jsx \
  src/lib/articleLabels.js \
  src/lib/articleLabels.test.js \
  src/styles/facts-library.css
if ! git diff --cached --quiet; then
  git commit -m "$(cat <<'EOF'
feat(articles): searchable shelf for corpus PDFs and notes

Replace the chip cloud with search, filters, sort, clean titles, and note/highlight badges so indexed and opened articles are browsable.
EOF
)"
else
  echo "skip articles (nothing staged)"
fi

echo
echo "== commits not on origin yet =="
git log --oneline origin/main..HEAD

echo
echo "== leftover uncommitted? =="
git status -sb

echo
echo "Run tests, then push when ready:"
echo "  npm test && git push origin main"
