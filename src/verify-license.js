const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyB2oZWCv3FHF6Q4Je4Pil3uhqRcAscJ6Dc",
    authDomain: "screen-time-browser.firebaseapp.com",
    projectId: "screen-time-browser",
    storageBucket: "screen-time-browser.appspot.com",
    messagingSenderId: "634145398188",
    appId: "1:634145398188:web:0dfe29f105a78fc65bee09",
    measurementId: "G-Q6RPHPX837"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Verifies a license key against the Firestore database.
 * @param {string} licenseKey - The license key to verify.
 * @param {string} deviceId - The unique device ID to verify.
 * @param {boolean} Active
 * @returns {Promise<{valid: boolean, message: string}>} - Verification result.
 */
async function verifyLicense(licenseKey, deviceId) {
    try {
        const licenseDocRef = doc(db, "licenses", licenseKey);
        const licenseDoc = await getDoc(licenseDocRef);

        if (!licenseDoc.exists()) {
            console.log("Invalid license key.");
            return { valid: false, message: "Invalid license key." };
        }

        const licenseData = licenseDoc.data();

        if (!licenseData.Active) {
            console.log("Inactive license.");
            return { valid: false, message: "Inactive license." };
        }

        if (licenseData.deviceId && licenseData.deviceId !== deviceId) {
            console.log("License is tied to a different device.");
            return { valid: false, message: "License is tied to a different device." };
        }

        // If deviceId is not yet registered, register it
        if (!licenseData.deviceId) {
            console.log("Registering device ID for this license.");
            await setDoc(licenseDocRef, { ...licenseData, deviceId }, { merge: true });
        }

        console.log("License verified successfully.");
        return { valid: true, message: "License verified successfully." };
    } catch (error) {
        console.error("Error verifying license:", error);
        return { valid: false, message: "Error verifying license." };
    }
}

module.exports = { verifyLicense };
