#!/usr/bin/env bash

npm run-script build-component
npm publish --access public
echo "Published npm demo"

npm run-script build-site
aws s3 cp --recursive dist s3://viv.vitessce.io
echo "New demo site at viv.vitessce.io"

npm run-script docs
aws s3 cp --recursive docs s3://viv.vitessce.io/docs
echo "New docs site at viv.vitessce.io/docs"
