# 🛡 Sentinel Scan Action

[![EU AI Act](https://img.shields.io/badge/EU%20AI%20Act-Verified%20by%20Sentinel-7c3aed)](https://sentinel-ai.dev)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Sentinel%20Scan-blue)](https://github.com/marketplace/actions/sentinel-ai-compliance-scan)

**Automated EU AI Act compliance scanning for every Pull Request.**

Sentinel analyzes your AI application manifest against the EU AI Act regulation and blocks non-compliant code from merging.

---

## Quick Start

```yaml
# .github/workflows/sentinel.yml
name: Sentinel Compliance

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  sentinel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Sentinel scan
        uses: sentinel-ai/sentinel-scan-action@v1
        with:
          manifest: "./manifest.json"
          enforce: "false" # Default: only warns on violations
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Turn on Gating

To strictly enforce compliance and block Pull Requests that fail the scan, set `enforce` to `true`:

```yaml
      - name: Strictly Enforce Compliance
        uses: sentinel-ai/sentinel-scan-action@v1
        with:
          manifest: "./manifest.json"
          enforce: "true" # Fails the job on NON_COMPLIANT
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## How It Works

1. **Checkout** — Your code is checked out.
2. **Scan** — Sentinel CLI runs offline against your `manifest.json`.
3. **Verdict** — `COMPLIANT` → ✅ pass. `NON_COMPLIANT` → ❌ fail (if `enforce: true`).
4. **PR Comment** — A detailed compliance report is posted to the Pull Request.

---

## Inputs

| Input | Description | Required | Default |
|---|---|---|---|
| `manifest` | Path to the AI application manifest | No | `./manifest.json` |
| `enforce` | If `true`, fails the job on `NON_COMPLIANT`. If `false`, only warns. | No | `false` |

## Environment

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Required for posting PR comments. Use `${{ secrets.GITHUB_TOKEN }}`. |

---

## PR Comment Preview

When the action runs on a Pull Request, it posts (or updates) a comment:

> ## 🛡 Sentinel EU AI Act Compliance Scan
>
> **Status:** ✅ `COMPLIANT`
>
> ### Triggered Rules
> _None_
>
> **Compliance Score:** 100%
>
> ---
> _Run locally:_
> ```bash
> npx @radu_api/sentinel-scan ./manifest.json
> ```

---

## Run Locally

```bash
npx @radu_api/sentinel-scan ./manifest.json
```

---

## Links

- 🌐 [sentinel-ai.dev](https://sentinel-ai.dev)
- 📦 [npm: @radu_api/sentinel-scan](https://www.npmjs.com/package/@radu_api/sentinel-scan)

---

## License

MIT
