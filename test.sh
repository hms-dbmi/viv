#!/usr/bin/env bash
set -o errexit

start() { echo travis_fold':'start:$1; echo $1; }
end() { echo travis_fold':'end:$1; }
die() { set +v; echo "$*" 1>&2 ; sleep 1; exit 1; }

start changelog
if [ "$GITHUB_REF" != 'refs/heads/master' ]; then
  diff CHANGELOG.md <(curl "https://raw.githubusercontent.com/hms-dbmi/viv/master/CHANGELOG.md") \
    && die 'Update CHANGELOG.md'
fi
end changelog

start prettier
npm run format
end prettier

start eslint
npm run lint
end eslint

# Shader compilation does not work on travis.
start test
npm run test
end test

start build
npm run build
npm run build:avivator
end build

echo 'ALL TESTS PASSED'
