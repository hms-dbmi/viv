npm run-script build-component
npm publish --access public
echo "Published npm demo"

npm run-script build-site
aws s3 cp --recursive dist s3://image-viewer.vitessce.io
echo "New demo site at image-viewer.vitessce.io"
