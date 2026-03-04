# 🛡️ Sentinel AI Compliance Scan
**Automated EU AI Act Audit in 10 Seconds. Directly in GitHub Actions.**

Sentinel is a high-precision audit engine designed to automatically verify your AI projects' compliance with **EU AI Act** regulations. Built on a secure **Rust/WASM** architecture, Sentinel provides surgical precision without ever exposing your source code or metadata to external servers.

### 🚀 Why Sentinel?
* **Private & Secure**: The entire audit runs locally within your GitHub container. Your code and manifests never leave your infrastructure.
* **Hardened Technology**: The core audit engine is compiled into **WebAssembly (WASM)**, ensuring ultra-fast execution and total protection of the underlying scanning algorithms.
* **Radical Efficiency (90/10 Rule)**: Uses a deterministic layer to resolve 90% of compliance tasks at zero cost, utilizing AI only as a "superior instance" for the remaining 10% of edge cases.
* **Zero Dependencies**: No need to install Node.js or external libraries. The WASM binary is self-contained and ready to run.

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
