import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import { auth } from '../firebase';

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export function subscribeToAuthChanges(callback: (user: UserSession | null) => void) {
  return onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || (user.isAnonymous ? 'Demo Kitchen User' : 'Kitchen Staff'),
        photoURL: user.photoURL,
        isAnonymous: user.isAnonymous
      });
    } else {
      callback(null);
    }
  });
}

export async function loginWithGoogle(): Promise<UserSession> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL,
    isAnonymous: false
  };
}

export async function loginAsDemoUser(): Promise<UserSession> {
  const result = await signInAnonymously(auth);
  return {
    uid: result.user.uid,
    email: 'demo@rustic-table.local',
    displayName: 'Chef Marco (Demo)',
    photoURL: null,
    isAnonymous: true
  };
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
