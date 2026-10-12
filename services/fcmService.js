import admin from "firebase-admin";

// Lazy initialization guard — only init once
const initializeFirebase = () => {
  if (admin.apps.length > 0) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountKey = process.env.FCM_SERVICE_ACCOUNT_KEY;

  if (!projectId || !serviceAccountKey) {
    console.warn("[FCM] Warning: FCM_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID is not set. Push notifications are disabled.");
    return false;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
    console.log("[FCM] Firebase Admin initialized successfully.");
    return true;
  } catch (err) {
    console.error("[FCM] Failed to initialize Firebase Admin:", err.message);
    return false;
  }
};

/**
 * Send a push notification to a single FCM token.
 * @param {string} fcmToken
 * @param {string} title
 * @param {string} body
 * @param {Object} data  - optional string key/value pairs
 * @returns {Promise<{success: boolean, messageId?: string, reason?: string}>}
 */
export async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!initializeFirebase()) {
    return { success: false, reason: "FCM not configured" };
  }

  if (!fcmToken) {
    return { success: false, reason: "No FCM token provided" };
  }

  // FCM data values must all be strings
  const stringData = {};
  for (const [k, v] of Object.entries(data)) {
    stringData[k] = String(v);
  }

  try {
    const messageId = await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: stringData,
      android: { priority: "high" },
    });
    return { success: true, messageId };
  } catch (err) {
    console.error("[FCM] sendPushNotification error:", err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * Send a push notification to multiple FCM tokens.
 * @param {string[]} tokens
 * @param {string} title
 * @param {string} body
 * @param {Object} data
 * @returns {Promise<{success: boolean, successCount?: number, failureCount?: number, reason?: string}>}
 */
export async function sendMulticastNotification(tokens, title, body, data = {}) {
  if (!initializeFirebase()) {
    return { success: false, reason: "FCM not configured" };
  }

  if (!tokens || tokens.length === 0) {
    return { success: false, reason: "No tokens provided" };
  }

  const stringData = {};
  for (const [k, v] of Object.entries(data)) {
    stringData[k] = String(v);
  }

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: stringData,
      android: { priority: "high" },
    });
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error("[FCM] sendMulticastNotification error:", err.message);
    return { success: false, reason: err.message };
  }
}
