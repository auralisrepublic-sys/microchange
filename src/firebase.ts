import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, runTransaction, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

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
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const CURRENCIES = {
  CAURA: { name: 'CAURA', rate: 0.25, nation: 'Cultural Republic of Auralis' },
  FARISTEL: { name: 'FARISTEL', rate: 1.0, nation: 'Kingdom of Faris' },
  SOLARIS: { name: 'SOLARIS', rate: 1.5, nation: 'Imperium Luminaria' }, // Assigned a rate for exchange logic
  UNITED_LAND_KING: { name: 'UNITED LAND KING', rate: 0.75, nation: 'Republic of United Land' },
  CHESSAR: { name: 'CHESSAR', rate: 4.17, nation: 'Cheese Kingdom' },
  NEW_GREENIAN_CROWN: { name: 'NEW GREENIAN CROWN', rate: 1.0, nation: 'New Grennia' },
  ECLAT: { name: 'Éclat', rate: 0.50, nation: 'Gaelic Kingdom of Mabruenia' }
};

export type CurrencyKey = keyof typeof CURRENCIES;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  alias: string;
  balances: Record<CurrencyKey, number>;
  preferredCurrency: CurrencyKey;
  createdAt: Timestamp;
}

export interface TransactionRecord {
  id?: string;
  fromUid: string;
  toUid: string;
  fromAlias: string;
  toAlias: string;
  amount: number;
  currency: CurrencyKey;
  timestamp: Timestamp;
  type: 'transfer' | 'exchange' | 'reserve_deposit' | 'reserve_withdraw' | 'purchase';
  reserveId?: string;
  reserveName?: string;
  productId?: string;
  productName?: string;
}

export interface Reserve {
  id: string;
  name: string;
  currency: CurrencyKey;
  balance: number;
  createdAt: Timestamp;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: CurrencyKey;
  sellerUid: string;
  sellerAlias: string;
  imageUrl?: string;
  createdAt: Timestamp;
}
