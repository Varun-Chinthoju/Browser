// firebase-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Download this from Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verifyLicense(licenseKey) {
  try {
    const doc = await db.collection('licenses').doc(licenseKey).get();
    if (doc.exists && doc.data().active) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('License verification failed:', error);
    return false;
  }
}

module.exports = { verifyLicense };
