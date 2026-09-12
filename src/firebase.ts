import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
} from 'firebase/firestore';
import firebaseConfigDefault from '../firebase-applet-config.json';

const env = (import.meta as any).env || {};

const activeFirebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigDefault.projectId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigDefault.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigDefault.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigDefault.authDomain,
  firestoreDatabaseId: env.VITE_FIRESTORE_DATABASE_ID || (firebaseConfigDefault as any).firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || (firebaseConfigDefault as any).storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfigDefault as any).messagingSenderId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(activeFirebaseConfig);

const databaseId = activeFirebaseConfig.firestoreDatabaseId || undefined;

// Initialize Firestore with force long polling for rock-solid iframe/proxy/Cloud Run connectivity without connection drops
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    },
    databaseId
  );
} catch {
  firestoreInstance = getFirestore(app, databaseId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Target Database ID for e-Rapor Merdeka (iihh Beres SD Inpres 2 Ulatan)
export const IIHH_BERES_DATABASE_ID = 'ai-studio-iihhberes2ulatan-4d8d204c-3913-4c1d-8f70-4cdb00f5a9a0';

// Storage key for user-configured IIH Beres database for SD Inpres 2 Ulatan
const LOCAL_STORAGE_IIHH_BERES_KEY = 'absensi_ulatan_iihh_beres_db_id';

/**
 * Returns the active IIH Beres database ID for SD Inpres 2 Ulatan.
 */
export function getCustomIIHHBeresDatabaseId(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_IIHH_BERES_KEY);
      // Clean up legacy Ogomojolo db if stored previously
      if (saved && (saved.includes('ogomojolo') || saved.includes('db02674d'))) {
        localStorage.removeItem(LOCAL_STORAGE_IIHH_BERES_KEY);
      } else if (saved && saved.trim() !== '') {
        return saved.trim();
      }
    } catch {
      // LocalStorage access fallback
    }
  }
  return env.VITE_IIHH_BERES_DATABASE_ID || IIHH_BERES_DATABASE_ID;
}

/**
 * Updates the custom IIH Beres database ID in localStorage
 */
export function setCustomIIHHBeresDatabaseId(dbId: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (dbId && dbId.trim() !== '') {
        localStorage.setItem(LOCAL_STORAGE_IIHH_BERES_KEY, dbId.trim());
      } else {
        localStorage.removeItem(LOCAL_STORAGE_IIHH_BERES_KEY);
      }
    } catch {
      // LocalStorage access fallback
    }
  }
}

/**
 * Cache for dynamic Firestore instances to avoid multiple initializations
 */
const firestoreInstancesCache = new Map<string, any>();

let _cachedIIHHBeresInstance: any = null;

/**
 * Returns the Firestore instance for IIH Beres, lazily initialized.
 */
export function getIIHHBeresFirestoreInstance(): any {
  const targetDbId = getCustomIIHHBeresDatabaseId();
  if (!targetDbId) return null;

  if (firestoreInstancesCache.has(targetDbId)) {
    return firestoreInstancesCache.get(targetDbId);
  }

  let instance;
  try {
    instance = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      },
      targetDbId
    );
  } catch {
    instance = getFirestore(app, targetDbId);
  }

  if (instance) {
    firestoreInstancesCache.set(targetDbId, instance);
    if (targetDbId === IIHH_BERES_DATABASE_ID) {
      _cachedIIHHBeresInstance = instance;
    }
  }
  return instance;
}

// Proxy/getter for backwards compatibility
export const iihhBeresDb = new Proxy({} as any, {
  get(_target, prop) {
    if (!_cachedIIHHBeresInstance) {
      _cachedIIHHBeresInstance = getIIHHBeresFirestoreInstance();
    }
    return _cachedIIHHBeresInstance ? (_cachedIIHHBeresInstance as any)[prop] : undefined;
  },
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore server
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    return true;
  } catch {
    return false;
  }
}

