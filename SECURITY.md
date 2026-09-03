# Security notes

## Patched transitive dependency

`vinext@1.0.0-beta.5` depends on `image-size@2.0.2`. No patched npm
release is available for the zero-length box loops reported for its HEIF/JXL
and ICNS parsers, so this repository applies a reproducible pnpm patch.

- HEIF/JXL upstream fix: https://github.com/image-size/image-size/commit/bdbe560bfd98af6feab93b46aed67f2f0a77e4d5
- ICNS upstream fix: https://github.com/image-size/image-size/commit/0f6a6665a166c530ba126a8ab8608a0603cb49dc
- Local patch: `patches/image-size@2.0.2.patch`

Because the installed package version remains `2.0.2`, registry-based audit
tools can continue to report these advisories even though the affected loops
are patched locally. Remove the local patch only after upgrading to a release
that contains equivalent fixes, then remove both matching `--ignore` entries
from `audit:prod` and rerun the full build and audit. The CI audit still fails
for every other production advisory.

## Reporting

Before making the repository public, enable GitHub Private Vulnerability
Reporting under **Settings → Security → Code security**. After it is enabled,
use **Security → Advisories → Report a vulnerability** instead of a public
issue. Until then, this project has no configured private reporting channel.
