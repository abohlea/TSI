import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Send } from "lucide-react-native";
import { observeAuth } from "../../src/lib/auth";
import { listenToMessages, sendTextMessage, type TsiMessage } from "../../src/lib/firestore";

type Message = {
  id: string;
  text: string;
  time: string;
  mine: boolean;
};

function formatMessageTime(value: unknown): string {
  if (
    !value ||
    typeof value !== "object" ||
    !("toDate" in value) ||
    typeof value.toDate !== "function"
  ) {
    return "";
  }
  return value.toDate().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const name = params.name || "Conversation";
  const [draft, setDraft] = useState("");
  const [uid, setUid] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => observeAuth((user) => setUid(user?.uid || "")), []);

  useEffect(() => {
    if (!params.id || !uid) return;
    return listenToMessages(
      params.id,
      (items: TsiMessage[]) =>
        setMessages(
          items
            .filter((item) => item.type === "text")
            .map((item) => ({
              id: item.id,
              text: item.text || "",
              time: formatMessageTime(item.createdAt),
              mine: item.senderId === uid,
            }))
        ),
      () => setSendError("La synchronisation des messages a échoué.")
    );
  }, [params.id, uid]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !uid || sending || !params.id) return;
    setSending(true);
    setSendError("");
    try {
      await sendTextMessage(params.id, uid, text);
      setDraft("");
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Envoi impossible. Réessayez."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Retour">
          <ArrowLeft size={22} color="#18334C" />
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.person}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.subtitle}>Conversation TSI</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Les messages sont synchronisés avec Firestore. Le chiffrement de bout en bout n’est pas encore disponible.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.conversation}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        <FlatList
          data={[...messages].reverse()}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Votre conversation commence ici</Text>
              <Text style={styles.emptyText}>Envoyez votre premier message.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.message, item.mine && styles.mineText]}>
                {item.text}
              </Text>
              <Text style={[styles.time, item.mine && styles.mineTime]}>
                {item.time}
              </Text>
            </View>
          )}
        />

        {sendError ? <Text style={styles.error}>{sendError}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="Écrire un message…"
            placeholderTextColor="#9AA5B2"
            style={styles.input}
            multiline
            maxLength={10000}
            editable={!sending}
            accessibilityLabel="Votre message"
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}
            accessibilityLabel="Envoyer le message"
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FA" },
  header: {
    height: 65,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EAF0F4",
  },
  back: { width: 34, height: 40, alignItems: "center", justifyContent: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#DCE8F2",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "800", fontSize: 15, color: "#29465E" },
  person: { flex: 1 },
  name: { fontSize: 14, fontWeight: "800", color: "#20364B" },
  subtitle: { fontSize: 10, color: "#8793A3", marginTop: 3 },
  notice: {
    marginTop: 12,
    marginHorizontal: 24,
    backgroundColor: "#E7F1EF",
    padding: 11,
    borderRadius: 12,
  },
  noticeText: { textAlign: "center", fontSize: 10, lineHeight: 15, color: "#55736D" },
  conversation: { flex: 1 },
  messages: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, gap: 12 },
  empty: { alignItems: "center", paddingVertical: 30 },
  emptyTitle: { color: "#526276", fontSize: 13, fontWeight: "700" },
  emptyText: { color: "#98A3B0", fontSize: 11, marginTop: 5 },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, borderRadius: 17 },
  mine: { alignSelf: "flex-end", backgroundColor: "#183B52", borderBottomRightRadius: 5 },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: "#EDF1F4",
  },
  message: { fontSize: 14, lineHeight: 20, color: "#2A3D52" },
  mineText: { color: "#FFFFFF" },
  time: { fontSize: 9, color: "#9AA5B2", textAlign: "right", marginTop: 4 },
  mineTime: { color: "#B8D2D0" },
  error: { color: "#A13D36", fontSize: 11, paddingHorizontal: 16, paddingBottom: 8 },
  composer: {
    marginHorizontal: 12,
    marginBottom: 8,
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8EDF2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  input: { flex: 1, maxHeight: 110, minHeight: 40, fontSize: 13, color: "#26384D", paddingHorizontal: 8, paddingTop: 10 },
  send: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#218C78",
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.45 },
});
