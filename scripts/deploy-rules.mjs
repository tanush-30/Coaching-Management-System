import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleAuth } from 'google-auth-library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

const auth = new GoogleAuth({
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
});

async function deployFirestoreRules() {
  console.log('🚀 Deploying updated Firestore security rules to Firebase...');
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const rulesContent = readFileSync(join(__dirname, '../firestore.rules'), 'utf-8');

  // 1. Create Ruleset
  const createRulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
  const rulesetRes = await fetch(createRulesetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent,
          },
        ],
      },
    }),
  });

  const rulesetData = await rulesetRes.json();
  if (!rulesetRes.ok) {
    throw new Error(`Ruleset creation failed: ${JSON.stringify(rulesetData)}`);
  }

  const rulesetName = rulesetData.name;
  console.log(`   ✅ Ruleset created: ${rulesetName}`);

  // 2. Release Ruleset to cloud.firestore
  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
  const releaseRes = await fetch(releaseUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: rulesetName,
      },
    }),
  });

  const releaseData = await releaseRes.json();
  if (!releaseRes.ok) {
    // If release doesn't exist yet, create it with POST
    const createReleaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`;
    const createReleaseRes = await fetch(createReleaseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: rulesetName,
      }),
    });
    const createData = await createReleaseRes.json();
    if (!createReleaseRes.ok) {
      throw new Error(`Release creation failed: ${JSON.stringify(createData)}`);
    }
  }

  console.log('🎉 Firestore security rules successfully deployed to Firebase Cloud!');
}

deployFirestoreRules().catch((err) => {
  console.error('❌ Failed to deploy rules:', err.message);
});
