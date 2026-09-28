#!/usr/bin/env sh
# Builds dist/job-application-tracker.zip for upload to the Chrome Web Store.
set -eu
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/job-application-tracker.zip
zip -r dist/job-application-tracker.zip \
  manifest.json content.js popup.html popup.js dashboard.html dashboard.js styles.css \
  libs icons -x '*.DS_Store'
echo "Wrote dist/job-application-tracker.zip"
