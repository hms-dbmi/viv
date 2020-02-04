#!/usr/bin/env bash
set -o errexit

start() { echo travis_fold':'start:$1; echo $1; }
end() { echo travis_fold':'end:$1; }
die() { set +v; echo "$*" 1>&2 ; sleep 1; exit 1; }



start changelog
if [ "$TRAVIS_BRANCH" != 'master' ]; then
  diff CHANGELOG.md <(curl "https://raw.githubusercontent.com/$TRAVIS_REPO_SLUG/master/CHANGELOG.md") \
    && die 'Update CHANGELOG.md'
fi
end changelog
