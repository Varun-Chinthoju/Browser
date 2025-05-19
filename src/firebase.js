// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB2oZWCv3FHF6Q4Je4Pil3uhqRcAscJ6Dc",
    authDomain: "screen-time-browser.firebaseapp.com",
    projectId: "screen-time-browser",
    storageBucket: "screen-time-browser.firebasestorage.app",
    messagingSenderId: "634145398188",
    appId: "1:634145398188:web:0dfe29f105a78fc65bee09",
    measurementId: "G-Q6RPHPX837"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function verifyLicense(licenseKey, deviceId) {
    try {
        const licenseRef = doc(db, "licenses", licenseKey);
        const licenseDoc = await getDoc(licenseRef);

        if (!licenseDoc.exists()) {
            return { valid: false, message: "Invalid license key." };
        }

        const licenseData = licenseDoc.data();

        if (licenseData.devices.includes(deviceId)) {
            return { valid: true, message: "License already registered." };
        }

        if (licenseData.devices.length >= licenseData.maxDevices) {
            return { valid: false, message: "Device limit reached." };
        }

        // Register the device
        await updateDoc(licenseRef, {
            devices: arrayUnion(deviceId)
        });

        return { valid: true, message: "License activated successfully." };
    } catch (error) {
        console.error("Error verifying license:", error);
        return { valid: false, message: "License verification failed." };
    }
}
