# 📘 Mastering EU AI Act Compliance
**A Developer's Handbook to the 2026 Regulation**

## Introduction
The EU AI Act is the world's first comprehensive AI law. For developers, this shifts compliance from a "legal problem" to a "technical requirement." Sentinel helps you bridge this gap in seconds.

## ⚖️ The 4 Risk Categories
1. **Unacceptable Risk**: (e.g., Social Scoring) — **Banned.**
2. **High Risk**: (e.g., Recruitment AI) — **Strict requirements.**
3. **Limited Risk**: (e.g., Chatbots) — **Transparency obligations.**
4. **Minimal Risk**: (e.g., Spam filters) — **Free use.**

## 🛠️ How to Prepare Your Manifest
Sentinel uses a `manifest.json` to understand your AI's capabilities. Here is the checklist for a **High-Risk** system:

### 1. Transparency (Art. 13)
Ensure users know they are interacting with AI.
- `transparency_disclosure_provided`: true

### 2. Data Governance (Art. 10)
Verify that your training data is documented and assessed for bias.
- `bias_assessment_performed`: true
- `data_governance_policy_documented`: true

### 3. Human Oversight (Art. 14)
The system must be designed to be overseen by natural persons.
- `human_oversight_enabled`: true

## 🚀 Integrating Sentinel in 3 Steps

### Step 1: Install
```bash
npx @radu_api/sentinel-scan --init
```

### Step 2: Audit
Run a local audit to find violations Before they reach production.
```bash
npx @radu_api/sentinel-scan ./manifest.json
```

### Step 3: Automate
Add the Sentinel GitHub Action to block non-compliant PRs.

---
_Need a Pro license for enterprise support? Visit [sentinel-ai.dev](https://sentinel-ai.dev)_
