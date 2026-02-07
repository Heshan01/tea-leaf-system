// app/(tabs)/lorry/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { onValue, ref } from "firebase/database";
import { db, rtdb } from "../../../lib/firebase";
import MiniMapOSM from "../../../components/MiniMapOSM";

const THEME = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E5E7EB",
  green: "#166534",
  green2: "#22C55E",
  greenSoft: "#DCFCE7",
  red: "#DC2626",
  dark: "#111827",
};

type Msg = {
  id: string;
  targetType?: "all" | "vehicle";
  vehicleId?: string | null;
  title?: string | null;
  body?: string;
  createdAtMs?: number;
};

export default function LorryDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const isSmall = width < 360;
  const isTablet = width >= 768;
  const P = isTablet ? 22 : isSmall ? 12 : 16;

  const vehicleId = useMemo(() => String(id || ""), [id]);

  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pos, setPos] = useState<any>(null);
  const [presence, setPresence] = useState<any>(null);

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);

  const [msgs, setMsgs] = useState<Msg[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "vehicles", vehicleId));
        if (snap.exists()) setVehicle({ id: snap.id, ...snap.data() });
        else setVehicle(null);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Vehicle load error");
      } finally {
        setLoading(false);
      }
    })();
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;
    const liveRef = ref(rtdb, `live/${vehicleId}`);
    const unsub = onValue(liveRef, (snap) => setPos(snap.exists() ? snap.val() : null));
    return () => unsub();
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;
    const pRef = ref(rtdb, `presence/vehicles/${vehicleId}`);
    const unsub = onValue(pRef, (snap) => setPresence(snap.exists() ? snap.val() : null));
    return () => unsub();
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;

    const qAll = query(
      collection(db, "messages"),
      where("targetType", "==", "all"),
      orderBy("createdAtMs", "desc"),
      limit(10)
    );

    const qVehicle = query(
      collection(db, "messages"),
      where("targetType", "==", "vehicle"),
      where("vehicleId", "==", vehicleId),
      orderBy("createdAtMs", "desc"),
      limit(10)
    );

    let allMsgs: Msg[] = [];
    let vehicleMsgs: Msg[] = [];

    const mergeAndSet = () => {
      const map = new Map<string, Msg>();
      [...allMsgs, ...vehicleMsgs].forEach((m) => map.set(m.id, m));
      const merged = Array.from(map.values()).sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      setMsgs(merged.slice(0, 12));
    };

    const unsub1 = onSnapshot(qAll, (snap) => {
      allMsgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      mergeAndSet();
    });

    const unsub2 = onSnapshot(qVehicle, (snap) => {
      vehicleMsgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      mergeAndSet();
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [vehicleId]);

  const openMaps = () => {
    if (!pos?.lat || !pos?.lng) return;
    Linking.openURL(`https://www.google.com/maps?q=${pos.lat},${pos.lng}`);
  };

  const removeVehicle = async () => {
    Alert.alert("Delete Lorry", `${vehicleId} delete කරන්නද?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "vehicles", vehicleId));
            Alert.alert("Deleted", "Vehicle doc deleted.");
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Delete error");
          }
        },
      },
    ]);
  };

  const sendMessage = async () => {
    const body = msgBody.trim();
    if (!body) return Alert.alert("Error", "Message එක type කරන්න");

    try {
      setSending(true);
      await addDoc(collection(db, "messages"), {
        targetType: "vehicle",
        vehicleId,
        title: msgTitle.trim() || null,
        body,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });

      setMsgOpen(false);
      setMsgTitle("");
      setMsgBody("");
      Alert.alert("Sent ✅", "Message sent to this lorry!");
    } catch (e: any) {
      Alert.alert("Send Failed", e?.message ?? "Unknown error");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <View style={{ padding: P, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={THEME.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: isTablet ? 20 : 18, fontWeight: "900", color: THEME.text }}>Lorry Details</Text>
          <Text style={{ color: THEME.muted }}>{vehicleId}</Text>
        </View>

        <Pressable
          onPress={() => setMsgOpen(true)}
          style={{
            backgroundColor: THEME.greenSoft,
            borderWidth: 1,
            borderColor: "#86EFAC",
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={THEME.green} />
          <Text style={{ color: THEME.green, fontWeight: "900" }}>Message</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator />
          <Text style={{ color: THEME.muted }}>Loading...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: P, paddingBottom: 28, gap: 12 }}>
          <View
            style={{
              backgroundColor: THEME.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 14,
              gap: 6,
            }}
          >
            {vehicle ? (
              <>
                <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>
                  {vehicleId} — {vehicle.nickname ?? vehicleId}
                </Text>
                <Text style={{ color: THEME.muted }}>Route: {vehicle.routeId ?? "-"}</Text>
                <Text style={{ color: THEME.muted }}>Driver: {vehicle.driverEmail ?? "-"}</Text>
                <Text style={{ color: THEME.muted }}>Driver UID: {vehicle.driverUid ?? "-"}</Text>
                {!!vehicle.description && <Text style={{ color: THEME.text }}>{vehicle.description}</Text>}
              </>
            ) : (
              <Text style={{ color: THEME.muted }}>Vehicle doc not found in Firestore.</Text>
            )}
          </View>

          <View
            style={{
              backgroundColor: THEME.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: "900", color: THEME.text }}>Status</Text>
            <Text style={{ color: THEME.muted }}>Online: {presence?.online ? "YES" : "NO"}</Text>
          </View>

          <MiniMapOSM lat={pos?.lat} lng={pos?.lng} height={isTablet ? 280 : 230} />

          <View
            style={{
              backgroundColor: THEME.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: "900", color: THEME.text }}>Live</Text>
            <Text style={{ color: THEME.muted }}>Lat: {pos?.lat ?? "-"}</Text>
            <Text style={{ color: THEME.muted }}>Lng: {pos?.lng ?? "-"}</Text>
            <Text style={{ color: THEME.muted }}>
              Updated: {pos?.updatedAt ? new Date(pos.updatedAt).toLocaleTimeString() : "-"}
            </Text>
            <Text style={{ color: THEME.muted }}>Driver UID: {pos?.driverUid ?? "-"}</Text>
          </View>

          <Pressable
            onPress={openMaps}
            disabled={!pos?.lat || !pos?.lng}
            style={{
              backgroundColor: pos?.lat && pos?.lng ? THEME.dark : "#94A3B8",
              padding: 14,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>Open in Google Maps</Text>
          </Pressable>

          <Pressable
            onPress={removeVehicle}
            style={{
              backgroundColor: THEME.red,
              padding: 14,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>Remove Lorry (Firestore)</Text>
          </Pressable>

          <View
            style={{
              backgroundColor: THEME.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 14,
              gap: 10,
            }}
          >
            <Text style={{ fontWeight: "900", color: THEME.text }}>Recent Messages</Text>

            {msgs.length === 0 ? (
              <Text style={{ color: THEME.muted }}>No messages yet...</Text>
            ) : (
              msgs.map((m) => (
                <View
                  key={m.id}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontWeight: "900", color: THEME.text }}>
                    {m.targetType === "all" ? "📢 Broadcast" : `🚚 ${vehicleId}`}
                    {m.title ? ` • ${m.title}` : ""}
                  </Text>
                  <Text style={{ color: THEME.muted }}>{m.body}</Text>
                </View>
              ))
            )}
          </View>

          <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center" }}>
            Production වල secure delete/create වලට Cloud Functions ඕන.
          </Text>
        </ScrollView>
      )}

      <Modal visible={msgOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ marginTop: "auto" }}>
            <View
              style={{
                backgroundColor: "white",
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                padding: P,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "900", color: THEME.text }}>Message → {vehicleId}</Text>
                <Pressable onPress={() => setMsgOpen(false)}>
                  <Text style={{ fontWeight: "900", color: THEME.green }}>Close</Text>
                </Pressable>
              </View>

              <TextInput
                placeholder="Title (optional)"
                value={msgTitle}
                onChangeText={setMsgTitle}
                placeholderTextColor="#94A3B8"
                style={{
                  borderWidth: 1,
                  borderColor: THEME.border,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "#F8FAFC",
                  color: THEME.text,
                }}
              />

              <TextInput
                placeholder="Type your message..."
                value={msgBody}
                onChangeText={setMsgBody}
                placeholderTextColor="#94A3B8"
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: THEME.border,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "#F8FAFC",
                  color: THEME.text,
                  minHeight: 110,
                  textAlignVertical: "top",
                }}
              />

              <Pressable
                onPress={sendMessage}
                disabled={sending}
                style={{
                  backgroundColor: sending ? "#86EFAC" : THEME.green2,
                  padding: 14,
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                {sending ? (
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <ActivityIndicator color="white" />
                    <Text style={{ color: "white", fontWeight: "900" }}>Sending...</Text>
                  </View>
                ) : (
                  <Text style={{ color: "white", fontWeight: "900" }}>Send</Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
