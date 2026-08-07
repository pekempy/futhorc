import { execSync } from 'node:child_process';

const arg = process.argv[2];

if (!arg) {
  console.error('❌ Error: Please specify a version tag.');
  console.error('Usage: npm run tag v0.0.6  (or: npm run tag 0.0.6)');
  process.exit(1);
}

const tag = arg.startsWith('v') ? arg : `v${arg}`;

try {
  console.log(`📌 Tagging release as ${tag}...`);
  execSync(`git tag -a ${tag} -m "Release ${tag}"`, { stdio: 'inherit' });

  console.log(`🚀 Pushing tag ${tag} to GitHub...`);
  execSync(`git push origin ${tag}`, { stdio: 'inherit' });

  console.log(`\n✅ Success! Tag ${tag} created and pushed.`);
  console.log(`GitHub Actions will now build and publish your Docker image to GHCR.`);
} catch (err) {
  console.error('❌ Tag or push failed:', err.message);
  process.exit(1);
}
