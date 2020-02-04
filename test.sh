#!/usr/bin/env bash
set -o errexit

start() { echo travis_fold':'start:$1; echo $1; }
end() { echo travis_fold':'end:$1; }
die() { set +v; echo "$*" 1>&2 ; sleep 1; exit 1; }

start prettier
node_modules/prettier/bin-prettier.js --check **/*.js
end prettier

start eslint
node_modules/eslint/bin/eslint.js .
end eslint

start changelog
if [ "$TRAVIS_BRANCH" != 'master' ]; then
  diff CHANGELOG.md <(curl "https://raw.githubusercontent.com/$TRAVIS_REPO_SLUG/master/CHANGELOG.md") \
    && die 'Update CHANGELOG.md'
fi
end changelog
