// Firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB2oZWCv3FHF6Q4Je4Pil3uhqRcAscJ6Dc",
    authDomain: "screen-time-browser.firebaseapp.com",
    projectId: "screen-time-browser",
    storageBucket: "screen-time-browser",
    messagingSenderId: "634145398188",
    appId: "1:634145398188:web:0dfe29f105a78fc65bee09",
    measurementId: "G-Q6RPHPX837"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function verifyLicense(licenseKey, deviceId) {
    // A special key that always grants access for development/demo purposes
    const DEVELOPER_KEY = "DEV-FREE-ACCESS-123";

    if (licenseKey === DEVELOPER_KEY) {
        console.log("Developer key detected. Granting access.");
        return { valid: true, message: "Developer access granted." };
    }

    try {
        const licenseRef = doc(db, "licenses", licenseKey);
        const licenseDoc = await getDoc(licenseRef);

        if (!licenseDoc.exists()) {
            console.warn(`License key not found: ${licenseKey}`);
            return { valid: false, message: "Invalid license key." };
        }

        const licenseData = licenseDoc.data();

        // Ensure the devices array exists
        if (!Array.isArray(licenseData.devices)) {
            console.warn(`No 'devices' array found for license key: ${licenseKey}`);
            licenseData.devices = [];
        }

        // Check if the device is already registered
        if (licenseData.devices.includes(deviceId)) {
            console.log(`Device already registered: ${deviceId}`);
            return { valid: true, message: "Device already registered." };
        }

        // Check if the maxDevices field exists, default to 1 if missing
        const maxDevices = licenseData.maxDevices || 1;

        // Check if the device limit is reached
        if (licenseData.devices.length >= maxDevices) {
            console.warn(`Device limit reached for license key: ${licenseKey}`);
            return { valid: false, message: "Device limit reached." };
        }

        // Register the new device
        console.log(`Registering device ${deviceId} to license ${licenseKey}...`);
        await updateDoc(licenseRef, {
            devices: arrayUnion(deviceId)
        });

        console.log(`License activated successfully for device ${deviceId}.`);
        return { valid: true, message: "License activated successfully." };

    } catch (error) {
        console.error("Error verifying license:", error);

        // Check for Firebase permission errors
        if (error.code === 'permission-denied') {
            return { valid: false, message: "Insufficient permissions. Check Firestore security rules." };
        }

        return { valid: false, message: "License verification failed." };
    }
}
