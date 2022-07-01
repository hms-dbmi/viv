#!/usr/bin/env bash
pnpm build --filter='./sites/*'
aws s3 cp --recursive sites/avivator/dist s3://avivator.gehlenborglab.org
aws s3 cp --recursive sites/docs/dist s3://viv.gehlenborglab.org
echo "New demo site at avivator.gehlenborglab.org and docs at viv.gehlenborglab.org"
