#!/usr/bin/env bash

# First, clean up CHANGELOG.md and add new section.
NEW_VERSION=$(node -p -e "require('./package.json').version")
sed -i ''  's/In Progress/'"$NEW_VERSION"'/g' CHANGELOG.md
sed -i '' '2s/^//p' CHANGELOG.md
sed -i '' '2s/^//p' CHANGELOG.md

sed -i '' '3i\'$'\n'"### Changed" CHANGELOG.md
sed -i '' '2s/^//p' CHANGELOG.md
sed -i '' '2s/^//p' CHANGELOG.md
sed -i '' '3i\'$'\n'"### Added" CHANGELOG.md
sed -i '' '2s/^//p' CHANGELOG.md
sed -i '' '2s/^//p' CHANGELOG.md
sed -i '' '3i\'$'\n'"## In Progress" CHANGELOG.md

# Add this to the current tag going to Github.
git add CHANGELOG.md
