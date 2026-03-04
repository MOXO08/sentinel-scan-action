# 🛡️ Sentinel AI Compliance Scan
**Automated EU AI Act Audit in 10 Seconds. Directly in GitHub Actions.**

![Compliance Badge](https://sentinel-api.sentinel-moxo.workers.dev/v1/badge?client_id=org_test_001)

Sentinel is a high-precision audit engine designed to automatically verify your AI projects' compliance with **EU AI Act** regulations. Built on a secure **Rust/WASM** architecture, Sentinel provides surgical precision without ever exposing your source code or metadata to external servers.

### 🚀 Why Sentinel?
* **Private & Secure**: The entire audit runs locally within your GitHub runner. Your code never leaves your infrastructure.
* **Instant Trust**: Display a dynamic Sentinel Compliance Badge on your repository.
* **Hardened Algorithms**: Core logic is protected by a WebAssembly (WASM) engine, ensuring high-speed and secure audits.
* **Smart Gating**: Automatically fail PRs that don't meet mandatory EU AI Act safety standards (Articles 5, 10, 13, 14, 22).

### 🛠️ Quick Start
Add Sentinel to your `.github/workflows/main.yml` file:

```yaml
steps:
  - name: Checkout Code
    uses: actions/checkout@v4

  - name: Run Sentinel AI Audit
    uses: radu_api/sentinel-scan-action@v1
    with:
      manifest: "path/to/manifest.json"
      license_token: ${{ secrets.SENTINEL_LICENSE }}
```
