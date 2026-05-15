const fs = require('fs');
const path = require('path');

const DEFAULT_LOCAL_API_BASE = 'http://localhost:8080';
const isNetlifyBuild = Boolean(process.env.NETLIFY);
const apiBase = process.env.API_BASE || (!isNetlifyBuild ? DEFAULT_LOCAL_API_BASE : '');

if (!apiBase) {
  console.error('Missing API_BASE environment variable for Netlify build.');
  process.exit(1);
}

const configPath = path.join(__dirname, '..', 'js', 'config.js');
const content = `window.APP_CONFIG = {
  API_BASE: ${JSON.stringify(apiBase)},
};
`;

fs.writeFileSync(configPath, content, 'utf8');
console.log(`Generated js/config.js with API_BASE=${apiBase}`);
