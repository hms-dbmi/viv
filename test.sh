#!/usr/bin/env bash
set -o errexit

start() { echo travis_fold':'start:$1; echo $1; }
end() { echo travis_fold':'end:$1; }
die() { set +v; echo "$*" 1>&2 ; sleep 1; exit 1; }

start changelog
if [ "$TRAVIS_BRANCH" != 'master' ]; then
  diff CHANGELOG.md <(curl "https://raw.githubusercontent.com/hms-dbmi/viv/master/CHANGELOG.md") \
    && die 'Update CHANGELOG.md'
fi
end changelog

start prettier
PRETTIER=node_modules/prettier/bin-prettier.js
PRETTIER_GLOB='**/*.js'
$PRETTIER --check "$PRETTIER_GLOB" --loglevel debug \
  || die "Prettier failed. Run:
     $PRETTIER --check '$PRETTIER_GLOB' --write"
# The '**' is quoted so the glob is expanded by prettier, not bash.
# (Mac default bash silently ignores **!)
# Use 'debug' so we get a list of files scanned.
end prettier

start eslint
node_modules/eslint/bin/eslint.js .
end eslint

# Shader compilation does not work on travis.
start test
if [[ "$CI" != 'true' ]]
then 
  npm run-script test:layers_views
fi
npm run-script test:loaders
end test

start build
npm run-script build-component
npm run-script build-site
end build

echo 'ALL TESTS PASSED'
