/**
 * Firebase, loaded on demand.
 *
 * Firebase backs accounts, the nutrition tracker, votes and dish rankings.
 * Menus and hours never touch it, so the SDK (Firestore's lite build: plain
 * reads and writes, no offline cache or listeners) is imported only when one of
 * those features is used, and a missing configuration turns them off rather
 * than breaking the page.
 *
 * Configure with VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN and
 * VITE_FIREBASE_PROJECT_ID (front-end/.env). VITE_FIREBASE_EMULATOR=1 points
 * the app at the local emulators started by `npm run emulators`.
 */
const env = import.meta.env ?? {};

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const useEmulator = env.VITE_FIREBASE_EMULATOR === '1';

export const isFirebaseConfigured = Boolean(config.projectId && (config.apiKey || useEmulator));

let services = null;

/** { auth, db, authApi, dbApi }, or null when Firebase is not configured. */
export async function firebase() {
  if (!isFirebaseConfigured) return null;
  if (services) return services;
  services = (async () => {
    const [{ initializeApp }, authApi, dbApi] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore/lite'),
    ]);
    const app = initializeApp({ ...config, apiKey: config.apiKey || 'emulator' });
    const auth = authApi.getAuth(app);
    const db = dbApi.getFirestore(app);
    if (useEmulator) {
      authApi.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      dbApi.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
    return { auth, db, authApi, dbApi };
  })();
  return services;
}

/** Only verified @northeastern.edu addresses may post rankings and votes. */
export const NU_EMAIL = /^[^@\s]+@northeastern\.edu$/i;
