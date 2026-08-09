# js.offtrackbetting.com

Source repository for JavaScript assets published to the `js.offtrackbetting.com` S3 bucket and served through the `js2.offtrackbetting.com` CloudFront distribution.

## Deployment

1. Add or update assets in this repository.
2. Commit the changes.
3. Run `git push`.
4. The local `.git/hooks/pre-push` wrapper runs `scripts/sync-to-s3.sh` before Git sends refs to GitHub.
5. If any S3 synchronization fails, the script exits nonzero and blocks the push.
6. After a successful push, verify the asset through `https://js2.offtrackbetting.com/js/...`.

The sync uses `--delete`, so each local directory is authoritative for its corresponding S3 prefix. The script publishes immediate child directories under `js/`; files directly under `js/` are not included by this hook.

All published JavaScript directories receive `max-age=31536000,s-maxage=31536000`, except `js/json`, which receives `max-age=600,s-maxage=600`. Put immutable assets in versioned directories so updates do not reuse a one-year-cached URL.

The hook implementation is intentionally small. Deployment logic lives in the tracked `scripts/sync-to-s3.sh` file. Install the tracked wrapper after a fresh clone:

```sh
cp hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push scripts/sync-to-s3.sh
```

## Future Improvement

Replace the workstation-local hook with a GitHub Actions workflow that runs after GitHub accepts the push. This will make GitHub the source of truth and avoid publishing assets before the remote push is confirmed.
