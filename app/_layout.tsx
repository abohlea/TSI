import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { firebaseConfigured } from "../src/lib/firebase";
import { observeAuth } from "../src/lib/auth";

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  useEffect(() => {
    if (!firebaseConfigured) {
      if (segments[0] !== "login") router.replace("/login");
      return;
    }
    const unsubscribe = observeAuth((user) => {
      const onLogin = segments[0] === "login";
      if (!user && !onLogin) router.replace("/login");
      if (user && onLogin) router.replace("/");
    });
    return unsubscribe;
  }, [router, segments]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthGate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F5F7FA" } }} />
    </SafeAreaProvider>
  );
}
