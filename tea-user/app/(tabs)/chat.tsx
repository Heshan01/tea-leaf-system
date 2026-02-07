// app/(tabs)/chat.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { addDoc, collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useUserContext } from "../../lib/useUserContext";
import theme from "../../constants/theme";

type Msg = {
  id: string;
  text: string;
  senderId: string;
  senderRole: string;
  createdAtMs: number;
  targetType: "route" | "vehicle" | "user";
  routeId?: string;
  vehicleId?: string;
  userId?: string;
};

export default function Chat() {
  const { uid, routeId, vehicleId, userName } = useUserContext();
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const listRef = useRef<FlatList>(null);

  // We show chat for route (primary). If no route, fallback to user chat.
  const targetType: Msg["targetType"] = routeId ? "route" : "user";

  useEffect(() => {
    if (!uid) return;

    const base = collection(db, "messages");

    const q =
      targetType === "route" && routeId
        ? query(base, where("targetType", "==", "route"), where("routeId", "==", routeId), orderBy("createdAtMs", "asc"))
        : query(base, where("targetType", "==", "user"), where("userId", "==", uid), orderBy("createdAtMs", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const arr: Msg[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setMsgs(arr);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
    });

    return () => unsub();
  }, [uid, routeId, targetType]);

  const send = async () => {
    if (!uid || !text.trim()) return;

    const payload: any = {
      text: text.trim(),
      senderId: uid,
      senderRole: "user",
      createdAtMs: Date.now(),
      targetType,
    };

    if (targetType === "route") {
      payload.routeId = routeId;
      payload.vehicleId = vehicleId ?? null;
      payload.userName = userName ?? null;
    } else {
      payload.userId = uid;
      payload.userName = userName ?? null;
    }

    setText("");
    await addDoc(collection(db, "messages"), payload);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.primary, marginBottom: 10 }}>
          Chat {targetType === "route" ? `(Route ${routeId})` : "(User)"}
        </Text>

        <View style={{ flex: 1, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, overflow: "hidden" }}>
          <FlatList
            ref={listRef}
            data={msgs}
            keyExtractor={(x) => x.id}
            contentContainerStyle={{ padding: 12, gap: 10 }}
            renderItem={({ item }) => {
              const mine = item.senderId === uid;
              return (
                <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                  <View
                    style={{
                      backgroundColor: mine ? theme.colors.dark : theme.colors.bg,
                      borderWidth: mine ? 0 : 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.md,
                      padding: 10,
                    }}
                  >
                    <Text style={{ color: mine ? "white" : theme.colors.text, fontWeight: "700" }}>
                      {item.text}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.colors.muted, marginTop: 4, textAlign: mine ? "right" : "left" }}>
                    {new Date(item.createdAtMs).toLocaleTimeString()}
                  </Text>
                </View>
              );
            }}
          />

          <View style={{ flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type message..."
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: theme.colors.bg,
              }}
            />
            <Pressable onPress={send} style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 16, justifyContent: "center", borderRadius: theme.radius.md }}>
              <Text style={{ color: "white", fontWeight: "900" }}>Send</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
