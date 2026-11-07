import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAt,
  endAt,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { requireFirebase } from "./firebase";

export type TsiProfile = {
  uid: string;
  displayName: string;
  photoURL?: string;
  about?: string;
  phoneNumber?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type TsiMessage = {
  id: string;
  senderId: string;
  text: string;
  type: "text" | "image" | "video" | "file" | "audio";
  mediaUrl?: string;
  mediaName?: string;
  createdAt?: unknown;
};

export type TsiConversation = {
  id: string;
  memberIds: string[];
  title?: string;
  photoURL?: string;
  lastMessage?: string;
  lastMessageAt?: unknown;
  createdAt?: unknown;
};

function database() {
  const { db } = requireFirebase();
  return db;
}

export async function saveProfile(profile: TsiProfile): Promise<void> {
  const db = database();
  await setDoc(
    doc(db, "users", profile.uid),
    { ...profile, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getProfile(uid: string): Promise<TsiProfile | null> {
  const snapshot = await getDoc(doc(database(), "users", uid));
  return snapshot.exists() ? (snapshot.data() as TsiProfile) : null;
}

export function listenToProfile(
  uid: string,
  onChange: (profile: TsiProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(database(), "users", uid),
    (snapshot) =>
      onChange(snapshot.exists() ? (snapshot.data() as TsiProfile) : null),
    (error) => onError?.(error)
  );
}

export function listenToConversations(
  uid: string,
  onChange: (conversations: TsiConversation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const conversationsQuery = query(
    collection(database(), "conversations"),
    where("memberIds", "array-contains", uid),
    orderBy("lastMessageAt", "desc")
  );
  return onSnapshot(
    conversationsQuery,
    (snapshot) =>
      onChange(
        snapshot.docs.map(
          (item) => ({ id: item.id, ...item.data() }) as TsiConversation
        )
      ),
    (error) => onError?.(error)
  );
}

export function listenToMessages(
  conversationId: string,
  onChange: (messages: TsiMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const messagesQuery = query(
    collection(database(), "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    messagesQuery,
    (snapshot) =>
      onChange(
        snapshot.docs.map(
          (item) => ({ id: item.id, ...item.data() }) as TsiMessage
        )
      ),
    (error) => onError?.(error)
  );
}

export async function createConversation(
  memberIds: string[],
  title?: string
): Promise<string> {
  const uniqueMembers = [...new Set(memberIds)].filter(Boolean);
  if (uniqueMembers.length < 2 || uniqueMembers.length > 100) {
    throw new Error("Une conversation doit avoir entre 2 et 100 membres.");
  }
  const db = database();
  if (uniqueMembers.length === 2) {
    const sortedMembers = [...uniqueMembers].sort();
    const legacyQuery = query(
      collection(db, "conversations"),
      where("memberIds", "array-contains", sortedMembers[0])
    );
    const legacy = await getDocs(legacyQuery);
    const existingLegacy = legacy.docs.find((item) => {
      const members = (item.data().memberIds as string[] | undefined) ?? [];
      return members.length === 2 && sortedMembers.every((uid) => members.includes(uid));
    });
    if (existingLegacy) return existingLegacy.id;

    // A deterministic document ID plus a transaction prevents two devices
    // from creating duplicate direct conversations at the same time.
    const conversationRef = doc(db, "conversations", `direct_${sortedMembers.join("_")}`);
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(conversationRef);
      if (!existing.exists()) {
        transaction.set(conversationRef, {
          memberIds: sortedMembers,
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessage: "",
        });
      }
    });
    return conversationRef.id;
  }

  const conversation = await addDoc(collection(db, "conversations"), {
    memberIds: uniqueMembers,
    ...(title ? { title } : {}),
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessage: "",
  });
  return conversation.id;
}

export async function sendMediaMessage(
  conversationId: string,
  senderId: string,
  media: { url: string; type: "image" | "video" | "file" | "audio"; name?: string }
): Promise<string> {
  if (!media.url.startsWith("https://")) {
    throw new Error("Le fichier doit disposer d'une URL HTTPS sécurisée.");
  }
  const db = database();
  const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderId,
    text: "",
    type: media.type,
    mediaUrl: media.url,
    ...(media.name ? { mediaName: media.name } : {}),
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, "conversations", conversationId), {
    lastMessage: media.type === "image" ? "📷 Photo" : media.type === "video" ? "🎥 Vidéo" : media.type === "audio" ? "🎵 Audio" : "📎 Fichier",
    lastMessageAt: serverTimestamp(),
  });
  await batch.commit();
  return messageRef.id;
}

export async function sendTextMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<string> {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error("Le message est vide.");
  if (normalizedText.length > 10000) {
    throw new Error("Le message dépasse 10 000 caractères.");
  }
  const db = database();
  const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderId,
    text: normalizedText,
    type: "text",
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, "conversations", conversationId), {
    lastMessage: normalizedText,
    lastMessageAt: serverTimestamp(),
  });
  await batch.commit();
  return messageRef.id;
}

export async function searchProfiles(term: string, currentUid: string): Promise<TsiProfile[]> {
  const normalized = term.trim();
  if (normalized.length < 2) return [];
  const usersQuery = query(
    collection(database(), "users"),
    orderBy("displayName"),
    startAt(normalized),
    endAt(normalized + "\\uf8ff"),
    limit(20)
  );
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs
    .map((item) => item.data() as TsiProfile)
    .filter((profile) => profile.uid !== currentUid);
}
