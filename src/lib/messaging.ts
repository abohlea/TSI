import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { requireFirebase } from "./firebase";

export type TsiMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: unknown;
};

export async function createOrUpdateProfile(
  uid: string,
  profile: { displayName: string; photoURL?: string | null; phoneNumber?: string | null }
) {
  const { db } = requireFirebase();
  await setDoc(
    doc(db, "users", uid),
    { ...profile, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export function subscribeToConversations(
  uid: string,
  onData: (items: Array<Record<string, unknown> & { id: string }>) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const { db } = requireFirebase();
  const q = query(
    collection(db, "conversations"),
    where("memberIds", "array-contains", uid),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) =>
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => onError(error)
  );
}

export function subscribeToMessages(
  conversationId: string,
  onData: (items: TsiMessage[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const { db } = requireFirebase();
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<TsiMessage, "id">),
        }))
      ),
    (error) => onError(error)
  );
}

export async function sendTextMessage(
  conversationId: string,
  senderId: string,
  text: string
) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const { db } = requireFirebase();
  const conversation = doc(db, "conversations", conversationId);
  await addDoc(collection(conversation, "messages"), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
    type: "text",
  });
  await setDoc(
    conversation,
    { lastMessage: trimmed, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
