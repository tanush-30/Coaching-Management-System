// scripts/setAdminRole.ts
// CLI script: run once, manually, via CLI — never exposed as a public API route

import { adminAuth, adminDb } from '../src/lib/firebase-admin';

export async function setAdminRole(uid: string) {
  await adminAuth.setCustomUserClaims(uid, { role: 'admin' });
  await adminAuth.revokeRefreshTokens(uid);
  await adminDb.collection('user_roles').doc(uid).set({
    role: 'admin',
    updatedAt: new Date().toISOString(),
    updatedBy: 'cli-script',
  }, { merge: true });
  console.log(`User ${uid} successfully assigned role: admin`);
}

// Read UID from CLI args if run directly
const targetUid = process.argv[2];
if (targetUid) {
  setAdminRole(targetUid)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to set admin claim:', err);
      process.exit(1);
    });
}
