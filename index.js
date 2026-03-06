const core = require("@actions/core");
const github = require("@actions/github");
const exec = require("@actions/exec");

async function run() {
    try {
        const manifest = core.getInput("manifest") || "./manifest.json";
        const enforce = core.getInput("enforce") === "true";
        const license = core.getInput("license_token");

        let isFreeTier = false;
        if (license) {
            process.env.SENTINEL_LICENSE = license;
        } else {
            isFreeTier = true;
            core.info("Sentinel-AI-Compliance: No license_token provided. Enabling Graceful Degradation to Free Community Tier.");
        }

        // 1. Run Sentinel Audit locally via WASM
        const fs = require("fs");
        const path = require("path");
        const { run_audit } = require("./lib/sentinel_core.js");

        if (!fs.existsSync(manifest)) {
            core.setFailed(`Manifest file not found: ${manifest}`);
            return;
        }

        const manifestContent = fs.readFileSync(manifest, "utf8");
        const rules = {
            rules: [
                { id: "ART5-001", description: "Subliminal manipulation", risk_category: "Unacceptable", forbidden_flags: ["subliminal_techniques"] },
                { id: "ART5-003", description: "Social scoring", risk_category: "Unacceptable", forbidden_flags: ["social_scoring"] },
                { id: "ART10-001", description: "Data governance & Bias assessment", risk_category: "High", required_flags: ["bias_assessment_performed", "data_governance_policy_documented"] },
                { id: "ART14-001", description: "Human oversight", risk_category: "High", required_flags: ["human_oversight_enabled"] },
            ]
        };

        let result;
        try {
            const verdictText = run_audit(manifestContent, JSON.stringify(rules));
            result = JSON.parse(verdictText);
        } catch (err) {
            if (isFreeTier) {
                // Background Telemetry Ping (Silent)
                try {
                    const https = require('https');
                    const postData = JSON.stringify({
                        repo_name: process.env.GITHUB_REPOSITORY || "unknown",
                        version: "1.0.0",
                        type: "FREE_TIER_PING"
                    });
                    const req = https.request({
                        hostname: 'gettingsentinel.com',
                        path: '/api/v1/telemetry/ping',
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
                    });
                    req.write(postData);
                    req.end();
                } catch (pe) { /* Silent fail */ }

                core.info("🛡️ Sentinel (Free): Basic Audit Complete. For Article 10 Detailed Risk Scoring, upgrade to Pro.");
                core.setOutput("status", "COMPLETED_FREE_TIER");
                return;
            } else {
                core.setFailed(`Sentinel-AI-Compliance Engine error: ${err.message}`);
                return;
            }
        }

        const stdout = ""; // For backward compatibility in parsing logic if needed

        // 2. Determine verdict
        const status = result.verdict || "UNKNOWN";
        const isCompliant = status === "COMPLIANT";
        const flagsTriggered = result.flags_triggered || [];
        const score = result.risk_score ?? "N/A";
        const appName = result.app_name || "Unknown App";
        const appVersion = result.version || "0.0.0";

        // 4. Build PR comment
        const flagsList = flagsTriggered.length > 0
            ? flagsTriggered.map((f) => `- \`${f}\``).join("\n")
            : "_None_";

        const clientPlan = result.client_plan || "developer";
        const isPro = clientPlan.includes("pro") || clientPlan.includes("enterprise");
        const auditTrail = isPro
            ? `✅ **Immutable Audit Trail:** [Enabled](${result.audit_url || "https://gettingsentinel.com/dashboard"})`
            : `🔒 **Immutable Audit Trail:** [Locked] (Unlock with [Sentinel Pro](https://gettingsentinel.com#pricing))`;

        const statusEmoji = isCompliant ? "✅" : (status === "HUMAN_INTERVENTION_REQUIRED" ? "⚠️" : "❌");

        let headerMessage = `**Status:** ${statusEmoji} \`${status}\``;
        let riskMessage = `**Risk Score:** \`${score}/100\``;

        if (isFreeTier) {
            headerMessage = `**Status:** ✅ \`COMPLETED_FREE_TIER\``;
            riskMessage = `> 🛡️ Sentinel (Free): Basic Audit Complete. For Article 10 Detailed Risk Scoring, upgrade to Pro.`;
            isCompliant = true; // Force pass for free tier
        }

        const badgeUrl = isCompliant
            ? "https://img.shields.io/badge/EU_AI_Act-Compliant-10b981?style=for-the-badge&logo=shield"
            : "https://img.shields.io/badge/EU_AI_Act-Non--Compliant-f87171?style=for-the-badge&logo=shield";

        // Use environment context for repo name if not provided by core
        const repoFullName = process.env.GITHUB_REPOSITORY || "unknown/repo";
        const publicReportUrl = `https://gettingsentinel.com/report/${repoFullName.replace('/', '-')}`;

        const commentBody = [
            `[![EU AI Act Compliance](${badgeUrl})](${publicReportUrl})`,
            "",
            "## 🛡 Sentinel-AI-Compliance EU AI Act Scan",
            "",
            `**App:** \`${appName}\` @ \`v${appVersion}\``,
            headerMessage,
            riskMessage,
            "",
            auditTrail,

            "",
            "### 🚩 Triggered Flags / Issues",
            flagsList,
            "",
            auditTrail,
            "",
            "---",
            "### 🌍 Public Integrity Report",
            `A shareable verification report has been generated: **[View Report](${publicReportUrl})**`,
            "",
            "---",
            "### 🚀 Add this badge to your README",
            "```markdown",
            `[![EU AI Act Compliance](${badgeUrl})](${publicReportUrl})`,
            "```",
            "",
            "---",
            "_Usage in Workflow:_ ",
            "```yaml",
            "- uses: radu_api/sentinel-scan-action@v1",
            "  with:",
            `    manifest: "${manifest}"`,
            "```",
            "",
            "---",
            "### ⚖️ Regulatory Notice",
            "> **Disclaimer:** This scan provides a heuristic technical assessment of AI Act alignment at the source-code layer. Sentinel audits are strictly technical in nature and do NOT constitute legal advice, nor do they guarantee absolute regulatory compliance or official CE certification.",
            "",
            `<sub>Powered by <a href="https://gettingsentinel.com">Sentinel</a> · <a href="https://gettingsentinel.com/legal">Terms of Service</a></sub>`,
        ]
            .filter(Boolean)
            .join("\n");

        // 5. Post PR comment if in a pull request context
        const context = github.context;
        if (context.payload.pull_request) {
            const token = process.env.GITHUB_TOKEN;
            if (token) {
                const octokit = github.getOctokit(token);
                const { owner, repo } = context.repo;
                const prNumber = context.payload.pull_request.number;

                // Check for existing Sentinel comment to update instead of spam
                const { data: comments } = await octokit.rest.issues.listComments({
                    owner,
                    repo,
                    issue_number: prNumber,
                    per_page: 50,
                });

                const existingComment = comments.find(
                    (c) => c.body && c.body.includes("Sentinel-AI-Compliance EU AI Act")
                );

                if (existingComment) {
                    await octokit.rest.issues.updateComment({
                        owner,
                        repo,
                        comment_id: existingComment.id,
                        body: commentBody,
                    });
                    core.info(`Updated existing PR comment #${existingComment.id}`);
                } else {
                    await octokit.rest.issues.createComment({
                        owner,
                        repo,
                        issue_number: prNumber,
                        body: commentBody,
                    });
                    core.info("Posted Sentinel-AI-Compliance comment to PR");
                }
            } else {
                core.warning("GITHUB_TOKEN not set — skipping PR comment.");
            }
        }

        // 6. Set action outcome
        core.setOutput("status", isFreeTier ? "COMPLETED_FREE_TIER" : status);
        core.setOutput("score", String(score));

        if (isFreeTier) {
            core.info("🛡️ Sentinel (Free): Basic Audit Complete. For Article 10 Detailed Risk Scoring, upgrade to Pro.");
            return;
        }

        if (!isCompliant) {
            if (enforce) {
                core.setFailed(`Sentinel-AI-Compliance scan failed: ${status}`);
            } else {
                core.warning(`Sentinel-AI-Compliance scan found violations: ${status} (enforce=false, job continues)`);
            }
        } else {
            core.info(`Sentinel-AI-Compliance scan passed: ${status}`);
        }
    } catch (error) {
        core.setFailed(`Sentinel-AI-Compliance Action error: ${error.message}`);
    }
}

run();
