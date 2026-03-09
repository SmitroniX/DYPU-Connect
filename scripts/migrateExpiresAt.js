/* eslint-disable @typescript-eslint/no-require-imports */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json'); // Assumes this exists

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function addExpiresAtToOldMessages(collectionName) {
    console.log(`Starting migration for ${collectionName}...`);
    const snapshot = await db.collection(collectionName).get();
    let count = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.expiresAt) {
            // Default to 48 hours from the original timestamp, or now if timestamp is missing
            let originalTime = data.timestamp ? data.timestamp.toDate() : new Date();
            let expireTime = new Date(originalTime.getTime() + 48 * 60 * 60 * 1000); // Add 48 hours
            
            // If the calculated expireTime is already in the past, just set it to 1 hour from now 
            // to allow people to see it briefly and let the TTL catch it smoothly
            if (expireTime < new Date()) {
                expireTime = new Date(new Date().getTime() + 60 * 60 * 1000); 
            }

            await db.collection(collectionName).doc(doc.id).update({
                expiresAt: expireTime
            });
            count++;
            console.log(`Updated ${doc.id} with expiresAt: ${expireTime}`);
        }
    }
    console.log(`Finished ${collectionName}. Updated ${count} documents.`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function run() {
    try {
        await addExpiresAtToOldMessages('public_chat');
        await addExpiresAtToOldMessages('anonymous_public_chat');
        console.log('Migration complete.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

// run(); // Intentionally commented out, user might need to run this manually if TTL fails due to missing fields.
