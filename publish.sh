#!/usr/bin/env bash

npm run-script build-component
npm publish --access public
echo "Published npm demo"

npm run-script build-site
aws s3 cp --recursive dist s3://viv.vitessce.io
echo "New demo site at viv.vitessce.io"

# This removes the "In Progress" from the changelog.
sed -i ""  's/ - In Progress//g' CHANGELOG.md
