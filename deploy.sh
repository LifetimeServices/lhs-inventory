#!/bin/bash
# ============================================================
# LHS Inventory - One-Command GitHub Deploy
# Run this once to set up, then again for every update
# ============================================================

GITHUB_USER="LifetimeServices"
REPO_NAME="lhs-inventory"
REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo ""
echo "================================================"
echo "  LHS Inventory — Deploying to GitHub Pages"
echo "================================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo "ERROR: git is not installed."
  echo "Download from: https://git-scm.com/download/win"
  exit 1
fi

# Check index.html exists
if [ ! -f "index.html" ]; then
  echo "ERROR: index.html not found in current folder."
  echo "Make sure you run this script from the lhs-inventory folder."
  exit 1
fi

# Init git if needed
if [ ! -d ".git" ]; then
  echo "Setting up git for the first time..."
  git init
  git remote add origin "$REPO_URL"
fi

# Stage, commit, push
echo "Uploading to GitHub..."
git add -A
git commit -m "LHS App update - $(date '+%Y-%m-%d %H:%M')"
git branch -M main
git push -u origin main --force

echo ""
echo "✅ Done! Your app is live at:"
echo "   https://${GITHUB_USER}.github.io/${REPO_NAME}"
echo ""
echo "It may take 60 seconds for changes to appear."
echo "================================================"
