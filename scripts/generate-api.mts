// Downloads the Basic-Auth protected Swagger document, then runs NSwag against the local copy.
// Usage: npm run generate-api   (requires src/nswag/swagger-credentials.ts — see swagger-credentials.example.ts)
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const credentialsPath = join(root, 'src/nswag/swagger-credentials.ts');
const swaggerPath = join(root, 'src/nswag/swagger.json');

if (!existsSync(credentialsPath)) {
  console.error('Missing src/nswag/swagger-credentials.ts — copy swagger-credentials.example.ts and fill in the credentials.');
  process.exit(1);
}

const { swaggerCredentials } = await import(pathToFileURL(credentialsPath).href);
const { url, username, password } = swaggerCredentials as { url: string; username: string; password: string };
if (!username || !password) {
  console.error('Fill in username and password in src/nswag/swagger-credentials.ts.');
  process.exit(1);
}

const response = await fetch(url, {
  headers: { Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64') },
});
if (!response.ok) {
  console.error(`Failed to download Swagger document: ${response.status} ${response.statusText}`);
  process.exit(1);
}

writeFileSync(swaggerPath, await response.text());
console.log(`Swagger document saved to ${swaggerPath}`);

execSync('npx nswag run src/nswag/nswag.json', { cwd: root, stdio: 'inherit' });
