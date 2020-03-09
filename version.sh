#!/usr/bin/env bash

# First, clean up CHANGELOG.md and add new section.
sed -i ''  's/ - In Progress//g' CHANGELOG.md
sed -i '' '2s/^//p' CHANGELOG.md
sed -i '' '2s/^//p' CHANGELOG.md
NEW_VERSION=$(node -p -e "require('./package.json').version")
sed -i '' '3i\'$'\n'"## $NEW_VERSION - In Progress" CHANGELOG.md

# Add this to the current tag going to Github.
git add CHANGELOG.md
