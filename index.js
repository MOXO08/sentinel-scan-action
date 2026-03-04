const core = require("@actions/core");
const github = require("@actions/github");
const exec = require("@actions/exec");

async function run() {
    try {
        const manifest = core.getInput("manifest") || "./manifest.json";
        const enforce = core.getInput("enforce") === "true";

        // 1. Run Sentinel CLI via npx, capture JSON output
        let stdout = "";
        let stderr = "";

        const exitCode = await exec
            .exec("npx", ["-y", "@radu_api/sentinel-scan", manifest, "--json"], {
                listeners: {
                    stdout: (data) => { stdout += data.toString(); },
                    stderr: (data) => { stderr += data.toString(); },
                },
                ignoreReturnCode: true,
            })
            .catch(async () => {
                // Fallback: install globally if npx fails
                core.info("npx @radu_api/sentinel-scan not found, installing package...");
                await exec.exec("npm", ["install", "-g", "@radu_api/sentinel-scan"]);
                stdout = "";
                stderr = "";
                return exec.exec("sentinel-scan", [manifest, "--json"], {
                    listeners: {
                        stdout: (data) => { stdout += data.toString(); },
                        stderr: (data) => { stderr += data.toString(); },
                    },
                    ignoreReturnCode: true,
                });
            });

        // 2. Parse JSON output
        let result;
        try {
            // Extract JSON from stdout (skip any non-JSON prefix lines)
            const jsonStart = stdout.indexOf("{");
            const jsonEnd = stdout.lastIndexOf("}");
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error("No JSON object found in CLI output");
            }
            const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
            result = JSON.parse(jsonStr);
        } catch (parseErr) {
            core.setFailed(`Failed to parse Sentinel output: ${parseErr.message}\nRaw output:\n${stdout}`);
            return;
        }

        // 3. Determine verdict
        const status = result.status || result.verdict || "UNKNOWN";
        const isCompliant = status === "COMPLIANT";
        const rulesTriggered = result.rules_triggered || result.triggered_rules || [];
        const score = result.score ?? result.compliance_score ?? "N/A";
        const summary = result.summary || "";

        // 4. Build PR comment
        const rulesList = rulesTriggered.length > 0
            ? rulesTriggered.map((r) => `- \`${typeof r === "string" ? r : r.rule_id || r}\``).join("\n")
            : "_None_";

        const statusEmoji = isCompliant ? "✅" : "❌";
        const commentBody = [
            "## 🛡 Sentinel EU AI Act Compliance Scan",
            "",
            `**Status:** ${statusEmoji} \`${status}\``,
            "",
            "### Triggered Rules",
            rulesList,
            "",
            `**Compliance Score:** ${score}${typeof score === "number" ? "%" : ""}`,
            "",
            summary ? `> ${summary}` : "",
            "",
            "---",
            "_Run locally:_",
            "```bash",
            `npx @radu_api/sentinel-scan ${manifest}`,
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
