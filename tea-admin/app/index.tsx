import React, { useState } from "react";
import { View, Text } from "react-native";
import Login from "./login";
import { Redirect } from "expo-router";

export default function Index() {
  const [role, setRole] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  if (!role || !uid) {
    return <Login onDone={(r, u) => { setRole(r); setUid(u); }} />;
  }

  if (role !== "admin") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>මෙම app එක Admin පමණක්.</Text>
      </View>
    );
  }

  // ✅ go to tabs
  return <Redirect href="/(tabs)/home" />;
}
