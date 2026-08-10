import fs from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';

const projectEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
];

const hermesHome = process.env.HERMES_HOME || path.join(os.homedir(), 'AppData', 'Local', 'hermes');
const hermesEnvPath = path.join(hermesHome, '.env');

for (const envPath of projectEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

if (fs.existsSync(hermesEnvPath)) {
  dotenv.config({ path: hermesEnvPath, override: false });
}
