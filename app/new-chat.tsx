import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Search, UserRound, MessageCircle } from "lucide-react-native";
import type { User } from "firebase/auth";
import { observeAuth } from "../src/lib/auth";
import { createConversation, searchProfiles, type TsiProfile } from "../src/lib/firestore";

export default function NewChatScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<TsiProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingUid, setCreatingUid] = useState("");
  const [error, setError] = useState("");

  useEffect(() => observeAuth(setUser), []);

  async function search() {
    if (!user) return;
    if (term.trim().length < 2) {
      setError("Saisissez au moins 2 caractères pour rechercher.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResults(await searchProfiles(term, user.uid));
    } catch {
      setError("La recherche a échoué. Vérifiez votre connexion et les règles Firestore.");
    } finally {
      setLoading(false);
    }
  }

  async function startChat(profile: TsiProfile) {
    if (!user || creatingUid) return;
    setCreatingUid(profile.uid);
    setError("");
    try {
      const id = await createConversation([user.uid, profile.uid]);
      router.replace({ pathname: "/chat/[id]", params: { id, name: profile.displayName } });
    } catch {
      setError("Impossible de créer la conversation. Réessayez.");
      setCreatingUid("");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><ArrowLeft size={21} color="#20364B" /></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.title}>Nouvelle discussion</Text><Text style={styles.subtitle}>Retrouvez une personne sur TSI</Text></View>
      </View>
      <View style={styles.search}>
        <Search size={19} color="#8996A6" />
        <TextInput value={term} onChangeText={setTerm} onSubmitEditing={search} returnKeyType="search" placeholder="Nom de la personne" placeholderTextColor="#9AA5B2" style={styles.input} />
        <Pressable onPress={search} style={styles.searchButton}><Text style={styles.searchButtonText}>Chercher</Text></Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={{ marginTop: 30 }} color="#238C78" /> : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 30 }}
          ListEmptyComponent={<View style={styles.empty}><MessageCircle size={28} color="#A0ACB8" /><Text style={styles.emptyTitle}>Rechercher un membre</Text><Text style={styles.emptyText}>Les comptes TSI correspondant à votre recherche apparaîtront ici.</Text></View>}
          renderItem={({ item }) => (
            <Pressable onPress={() => startChat(item)} disabled={Boolean(creatingUid)} style={styles.person}>
              <View style={styles.avatar}><UserRound size={21} color="#31516A" /></View>
              <View style={{ flex: 1 }}><Text style={styles.name}>{item.displayName || "Membre TSI"}</Text><Text style={styles.about} numberOfLines={1}>{item.about || "Disponible sur TSI"}</Text></View>
              {creatingUid === item.uid ? <ActivityIndicator color="#238C78" /> : <Text style={styles.open}>Écrire</Text>}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FB", paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 12, paddingBottom: 24 },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 21, fontWeight: "800", color: "#17283F" },
  subtitle: { fontSize: 11, color: "#8793A3", marginTop: 4 },
  search: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E9EEF3" },
  input: { flex: 1, color: "#24364B", fontSize: 13, paddingVertical: 12 },
  searchButton: { backgroundColor: "#183B52", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10 },
  searchButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  error: { color: "#A13D36", fontSize: 12, marginTop: 12 },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingTop: 64 },
  emptyTitle: { fontSize: 14, color: "#526276", fontWeight: "800", marginTop: 12 },
  emptyText: { color: "#98A3B0", fontSize: 11, textAlign: "center", marginTop: 6, lineHeight: 17 },
  person: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#E9EEF3" },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#DCE8F2", alignItems: "center", justifyContent: "center" },
  name: { color: "#26384D", fontSize: 13, fontWeight: "700" },
  about: { color: "#8793A1", fontSize: 11, marginTop: 4 },
  open: { color: "#238C78", fontSize: 11, fontWeight: "800", paddingHorizontal: 8 },
});
