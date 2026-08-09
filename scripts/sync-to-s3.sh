#!/bin/sh

set -eu

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
AWS_CLI=${AWS_CLI:-/usr/local/bin/aws}
BUCKET=${STATIC_ASSET_BUCKET:-js.offtrackbetting.com}
LONG_CACHE=31536000
SHORT_CACHE=600

if [ ! -x "$AWS_CLI" ]; then
  echo "ERROR: AWS CLI is not executable: $AWS_CLI" >&2
  exit 1
fi

cd "$REPO_ROOT"

found_directory=0
for entry in js/*
do
  if [ ! -d "$entry" ]; then
    continue
  fi

  cache=$LONG_CACHE
  if [ "$entry" = "js/json" ]; then
    cache=$SHORT_CACHE
  fi

  echo "Syncing $entry to s3://$BUCKET/$entry (cache: ${cache}s)"
  "$AWS_CLI" s3 sync "$entry" "s3://$BUCKET/$entry" \
    --quiet \
    --cache-control "max-age=$cache,s-maxage=$cache" \
    --delete
  found_directory=1
done

if [ "$found_directory" -ne 1 ]; then
  echo "ERROR: No JavaScript directories found under $REPO_ROOT/js" >&2
  exit 1
fi

echo "JavaScript asset sync completed successfully."