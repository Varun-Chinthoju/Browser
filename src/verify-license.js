const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyB2oZWCv3FHF6Q4Je4Pil3uhqRcAscJ6Dc",
    authDomain: "screen-time-browser.firebaseapp.com",
    projectId: "screen-time-browser",
    storageBucket: "screen-time-browser.firebaseapp.com",
    messagingSenderId: "634145398188",
    appId: "1:634145398188:web:0dfe29f105a78fc65bee09",
    measurementId: "G-Q6RPHPX837"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEVELOPER_KEY = "DEV-FREE-ACCESS-123";

/**
 * Verifies a license key against the Firestore database.
 * @param {string} licenseKey - The license key to verify.
 * @param {string} deviceId - The unique device ID to verify.
 * @returns {Promise<{valid: boolean, message: string}>} - Verification result.
 */
async function verifyLicense(licenseKey, deviceId) {
    if (licenseKey === DEVELOPER_KEY) {
        console.log("Developer key detected. Granting access.");
        return { valid: true, message: "Developer access granted." };
    }

    try {
        const licenseDocRef = doc(db, "licenses", licenseKey);
        const licenseDoc = await getDoc(licenseDocRef);

        if (!licenseDoc.exists()) {
            console.log("Invalid license key.");
            return { valid: false, message: "Invalid license key." };
        }

        const licenseData = licenseDoc.data();

        if (!licenseData.active) {
            console.log("Inactive license.");
            return { valid: false, message: "Inactive license." };
        }

        if (licenseData.deviceId && licenseData.deviceId !== deviceId) {
            console.log("License is tied to a different device.");
            return { valid: false, message: "License is tied to a different device." };
        }

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
