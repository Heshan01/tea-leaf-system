// app/index.tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { router } from "expo-router";
import { auth } from "../lib/firebase";
import theme from "../constants/theme";

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      router.replace(user ? "/(tabs)/home" : "/login");
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
