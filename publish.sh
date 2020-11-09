#!/usr/bin/env bash

npm run build
npm publish --access public
echo "Published npm demo"

npm run build:avivator && npm run docs
aws s3 cp --recursive avivator/dist s3://avivator.gehlenborglab.org
aws s3 cp --recursive dist_docs s3://viv.gehlenborglab.org
echo "New demo site at avivator.gehlenborglab.org and docs at viv.gehlenborglab.org"
