const core = require("@actions/core");
const github = require("@actions/github");
const exec = require("@actions/exec");

async function run() {
    try {
        const manifest = core.getInput("manifest") || "./manifest.json";
        const enforce = core.getInput("enforce") === "true";
        const license = core.getInput("license_token");

        if (license) {
            process.env.SENTINEL_LICENSE = license;
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
            core.setFailed(`Sentinel Engine error: ${err.message}`);
            return;
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

        const statusEmoji = isCompliant ? "✅" : (status === "HUMAN_INTERVENTION_REQUIRED" ? "⚠️" : "❌");
        const commentBody = [
            "## 🛡 Sentinel EU AI Act Compliance Scan",
            "",
            `**App:** \`${appName}\` @ \`v${appVersion}\``,
            `**Status:** ${statusEmoji} \`${status}\``,
            `**Risk Score:** \`${score}/100\``,
            "",
            "### 🚩 Triggered Flags / Issues",
            flagsList,
            "",
            "---",
            "_Usage in Workflow:_ ",
            "```yaml",
            "- uses: radu_api/sentinel-scan-action@v1",
            "  with:",
            `    manifest: "${manifest}"`,
            "```",
            "",
            `<sub>Powered by <a href="https://sentinel-ai.dev">Sentinel</a></sub>`,
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
                    (c) => c.body && c.body.includes("Sentinel EU AI Act Compliance Scan")
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
                    core.info("Posted Sentinel compliance comment to PR");
                }
            } else {
                core.warning("GITHUB_TOKEN not set — skipping PR comment.");
            }
        }

        // 6. Set action outcome
        core.setOutput("status", status);
        core.setOutput("score", String(score));

        if (!isCompliant) {
            if (enforce) {
                core.setFailed(`Sentinel scan failed: ${status}`);
            } else {
                core.warning(`Sentinel scan found violations: ${status} (enforce=false, job continues)`);
            }
        } else {
            core.info(`Sentinel scan passed: ${status}`);
        }
    } catch (error) {
        core.setFailed(`Sentinel Action error: ${error.message}`);
    }
}

run();
