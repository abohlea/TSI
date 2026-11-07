import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { requireFirebase } from "./firebase";
import { saveProfile } from "./firestore";

export function observeAuth(
  callback: (user: User | null) => void
): Unsubscribe {
  const { auth } = requireFirebase();
  return onAuthStateChanged(auth, callback);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = displayName.trim();
  if (!normalizedName) throw new Error("Le nom est obligatoire.");
  if (password.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }
  const { auth } = requireFirebase();
  const credential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password
  );
  await updateProfile(credential.user, { displayName: normalizedName });
  await saveProfile({
    uid: credential.user.uid,
    displayName: normalizedName,
  });
  return credential.user;
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<User> {
  const { auth } = requireFirebase();
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );
  return credential.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { auth } = requireFirebase();
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function logout(): Promise<void> {
  const { auth } = requireFirebase();
  await signOut(auth);
}
