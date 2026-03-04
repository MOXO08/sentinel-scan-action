/**
 * Local Simulation: Sentinel Action
 * This script mocks the GitHub Action environment to verify the bundled dist/index.js.
 */
const path = require('path');
const fs = require('fs');

// 1. Mock GitHub Action Inputs
process.env['INPUT_MANIFEST'] = path.resolve('../sentinel-example-ai-app/manifest.json');
process.env['INPUT_ENFORCE'] = 'false';
process.env['INPUT_LICENSE_TOKEN'] = 'test-token-simulated';

// 2. Identify the bundled entry point
const actionPath = path.resolve('./dist/index.js');

console.log('--- SENTINEL ACTION LOCAL SIMULATION ---');
console.log(`Testing bundle: ${actionPath}`);

// 3. Execute the bundled action
try {
    require(actionPath);
    console.log('\nSimulation initiated. Action should execute and exit.');
} catch (err) {
    console.error('\n[FATAL] Action failed to launch:');
    console.error(err);
    process.exit(1);
}
