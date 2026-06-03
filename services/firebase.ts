import AsyncStorage from '@react-native-async-storage/async-storage';
import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
// Firebase v12의 firebase/auth 타입 정의에는 RN 전용 export가 빠져 있다.
// 런타임에선 Metro가 react-native 조건으로 해석해 정상 동작.
// @ts-ignore
import { type Auth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';
import { type FirebaseStorage, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

function ensureInit() {
  if (!hasFirebaseConfig) {
    throw new Error(
      'Firebase가 설정되지 않았습니다. .env에 EXPO_PUBLIC_FIREBASE_* 값을 입력하세요.',
    );
  }
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = initializeAuth(_app, { persistence: getReactNativePersistence(AsyncStorage) });
    _db = getFirestore(_app);
    _storage = getStorage(_app);
  }
}

export function getAuthInstance(): Auth {
  ensureInit();
  return _auth!;
}

export function getDb(): Firestore {
  ensureInit();
  return _db!;
}

export function getStorageInstance(): FirebaseStorage {
  ensureInit();
  return _storage!;
}
