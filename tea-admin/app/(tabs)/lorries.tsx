import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";
import { onValue, ref } from "firebase/database";
import { db, rtdb, adminCreateAuth } from "../../lib/firebase";

type Vehicle = {
  id: string;
  nickname?: string;
  routeId?: string;
  description?: string;
  active?: boolean;
  createdAt?: number;
  driverUid?: string;
  driverEmail?: string;
};

const COLLECTION = "vehicles";

// ✅ LIVE window: driver updates every 15s → 60s safe
const LIVE_WINDOW_MS = 60 * 1000;

const THEME = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E5E7EB",
  green: "#166534",
  green2: "#22C55E",
  greenSoft: "#DCFCE7",
  tealSoft: "#CCFBF1",
  redSoft: "#FEE2E2",
  redText: "#991B1B",
  tealText: "#0F766E",
  dark: "#111827",
};

export default function LorriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;

  const P = isTablet ? 22 : isSmall ? 12 : 16;
  const CARD = isTablet ? 18 : 16;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // ✅ RTDB
  // liveLastMs: { V1: 1700..., V2: 1700... }
  const [liveLastMs, setLiveLastMs] = useState<Record<string, number>>({});
  const [onlineIds, setOnlineIds] = useState<Record<string, boolean>>({});

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // message modal
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgTarget, setMsgTarget] = useState<{ type: "all" | "vehicle"; vehicleId?: string }>({ type: "all" });
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgSending, setMsgSending] = useState(false);

  // form
  const [vehicleId, setVehicleId] = useState("");
  const [nickname, setNickname] = useState("");
  const [routeId, setRouteId] = useState("");
  const [description, setDescription] = useState("");
  const [driverEmail, setDriverEmail] = useState("");
  const [driverPassword, setDriverPassword] = useState("");

  const resetForm = () => {
    setVehicleId("");
    setNickname("");
    setRouteId("");
    setDescription("");
    setDriverEmail("");
    setDriverPassword("");
  };

  const resetMsg = () => {
    setMsgTitle("");
    setMsgBody("");
  };

  // fallback load
  const loadVehiclesOnce = async () => {
    const snap = await getDocs(collection(db, COLLECTION));
    const list: Vehicle[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    setVehicles(list);
  };

  // realtime
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        const list: Vehicle[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setVehicles(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        Alert.alert("Firestore Error", err.message);
      }
    );
    return () => unsub();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadVehiclesOnce();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Refresh error");
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ LIVE (updatedAt-based) — FIXED
  useEffect(() => {
    const liveRef = ref(rtdb, "live");
    const unsub = onValue(liveRef, (snap) => {
      const data = snap.val() || {};
      const mapped: Record<string, number> = {};

      Object.keys(data).forEach((k) => {
        const updatedAt = Number(data[k]?.updatedAt || 0);
        if (updatedAt) mapped[k] = updatedAt;
      });

      setLiveLastMs(mapped);
    });

    return () => unsub();
  }, []);

  // Presence badge
  useEffect(() => {
    const pRef = ref(rtdb, "presence/vehicles");
    const unsub = onValue(pRef, (snap) => {
      const data = snap.val() || {};
      const mapped: Record<string, boolean> = {};
      Object.keys(data).forEach((k) => (mapped[k] = !!data[k]?.online));
      setOnlineIds(mapped);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      return (
        v.id.toLowerCase().includes(q) ||
        (v.nickname ?? "").toLowerCase().includes(q) ||
        (v.routeId ?? "").toLowerCase().includes(q)
      );
    });
  }, [vehicles, search]);

  const goDetails = (id: string) => {
    router.push({ pathname: "/(tabs)/lorry/[id]", params: { id } });
  };

  // ✅ Create DRIVER Auth + Vehicle + users/{uid}
  const createLorryAccount = async () => {
    const vId = vehicleId.trim().toUpperCase();
    const rId = routeId.trim().toUpperCase();
    const email = driverEmail.trim().toLowerCase();
    const pass = driverPassword.trim();

    if (!vId) return Alert.alert("Error", "Vehicle ID දාන්න (ex: V2)");
    if (!rId) return Alert.alert("Error", "Route ID දාන්න (ex: R1)");
    if (!email) return Alert.alert("Error", "Driver Email දාන්න");
    if (pass.length < 6) return Alert.alert("Error", "Password අවම 6 අකුරු");

    let createdUser: any = null;

    try {
      setSaving(true);

      const cred = await createUserWithEmailAndPassword(adminCreateAuth, email, pass);
      createdUser = cred.user;
      const driverUid = createdUser.uid;

      await setDoc(doc(db, COLLECTION, vId), {
        nickname: nickname.trim() || vId,
        routeId: rId,
        description: description.trim(),
        active: true,
        createdAt: Date.now(),
        driverUid,
        driverEmail: email,
      });

      await setDoc(doc(db, "users", driverUid), {
        role: "driver",
        email,
        vehicleId: vId,
        routeId: rId,
        createdAt: Date.now(),
      });

      await signOut(adminCreateAuth);

      setCreateOpen(false);
      resetForm();
      Alert.alert("Done ✅", "Driver account + Lorry created successfully!");
    } catch (e: any) {
      try {
        if (createdUser) await deleteUser(createdUser);
      } catch {}
      Alert.alert("Create Failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Send Message (All / Specific)
  const sendMessage = async () => {
    const body = msgBody.trim();
    if (!body) return Alert.alert("Error", "Message එක type කරන්න");

    try {
      setMsgSending(true);
      await addDoc(collection(db, "messages"), {
        targetType: msgTarget.type,
        vehicleId: msgTarget.vehicleId ?? null,
        title: msgTitle.trim() || null,
        body,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });

      setMsgOpen(false);
      resetMsg();
      Alert.alert("Sent ✅", msgTarget.type === "all" ? "Broadcast sent!" : "Message sent to lorry!");
    } catch (e: any) {
      Alert.alert("Send Failed", e?.message ?? "Unknown error");
    } finally {
      setMsgSending(false);
    }
  };

  const openBroadcast = () => {
    setMsgTarget({ type: "all" });
    resetMsg();
    setMsgOpen(true);
  };

  const openSpecific = (id: string) => {
    setMsgTarget({ type: "vehicle", vehicleId: id });
    resetMsg();
    setMsgOpen(true);
  };

  const Header = () => (
    <View style={{ padding: P, paddingBottom: 10, gap: 12 }}>
      <View
        style={{
          backgroundColor: THEME.card,
          borderRadius: 18,
          padding: CARD,
          borderWidth: 1,
          borderColor: THEME.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: isTablet ? 24 : 22, fontWeight: "900", color: THEME.text }}>
              Lorries
            </Text>
            <Text style={{ color: THEME.muted, marginTop: 4 }}>
              Pull down කරලා refresh කරන්න. Lorry එක click කලොත් details page එකට යනවා.
            </Text>
          </View>

          <Pressable
            onPress={openBroadcast}
            style={{
              backgroundColor: THEME.greenSoft,
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: "#86EFAC",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="megaphone-outline" size={18} color={THEME.green} />
            <Text style={{ color: THEME.green, fontWeight: "900" }}>Broadcast</Text>
          </Pressable>
        </View>

        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#F8FAFC",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: THEME.border,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "ios" ? 12 : 10,
          }}
        >
          <Ionicons name="search" size={18} color={THEME.muted} />
          <TextInput
            placeholder="Search: V1 / nickname / route"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, color: THEME.text }}
            placeholderTextColor="#94A3B8"
          />
          <Pressable onPress={onRefresh}>
            <Ionicons name="refresh" size={18} color={THEME.green} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <Header />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator />
          <Text style={{ color: THEME.muted }}>Loading lorries...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: P, paddingTop: 6, gap: 12, paddingBottom: 90 }}
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View
              style={{
                backgroundColor: THEME.card,
                borderRadius: 18,
                padding: CARD,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>No lorries found</Text>
              <Text style={{ color: THEME.muted }}>
                Firestore `{COLLECTION}` collection එකට docs තියෙනවද බලන්න.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const lastMs = liveLastMs[item.id] || 0;
            const isLive = lastMs > 0 && Date.now() - lastMs < LIVE_WINDOW_MS;

            const isOnline = !!onlineIds[item.id];

            const badgeBg = isLive ? THEME.greenSoft : isOnline ? THEME.tealSoft : THEME.redSoft;
            const badgeText = isLive ? THEME.green : isOnline ? THEME.tealText : THEME.redText;
            const label = isLive ? "LIVE" : isOnline ? "ONLINE" : "OFFLINE";

            return (
              <Pressable
                onPress={() => goDetails(item.id)}
                style={{
                  backgroundColor: THEME.card,
                  borderRadius: 18,
                  padding: CARD,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ gap: 3, flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontWeight: "900", fontSize: 16, color: THEME.text }}>
                      {item.id} — {item.nickname ?? item.id}
                    </Text>
                    <Text style={{ color: THEME.muted }}>
                      Route: {item.routeId ?? "-"} • {item.description ?? "No description"}
                    </Text>

                    {/* optional: show last update time */}
                    <Text style={{ color: "#94A3B8", marginTop: 3, fontSize: 12 }}>
                      Last: {lastMs ? new Date(lastMs).toLocaleTimeString() : "-"}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end", gap: 10 }}>
                    <View
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        backgroundColor: badgeBg,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: badgeText }}>{label}</Text>
                    </View>

                    <Pressable
                      onPress={() => openSpecific(item.id)}
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderWidth: 1,
                        borderColor: THEME.border,
                        padding: 10,
                        borderRadius: 14,
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={THEME.green} />
                    </Pressable>
                  </View>
                </View>

                <View style={{ height: 12 }} />

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="chevron-forward" size={18} color={THEME.green} />
                  <Text style={{ color: THEME.green, fontWeight: "900" }}>Open details</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Floating FAB (create lorry) */}
      <Pressable
        onPress={() => {
          resetForm();
          setCreateOpen(true);
        }}
        style={{
          position: "absolute",
          right: 18,
          bottom: 18,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: THEME.green2,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>

      {/* ✅ MESSAGE MODAL */}
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
                <Text style={{ fontSize: 18, fontWeight: "900", color: THEME.text }}>
                  {msgTarget.type === "all"
                    ? "Broadcast Message"
                    : `Message → ${msgTarget.vehicleId}`}
                </Text>
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
                disabled={msgSending}
                style={{
                  backgroundColor: msgSending ? "#86EFAC" : THEME.green2,
                  padding: 14,
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                {msgSending ? (
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <ActivityIndicator color="white" />
                    <Text style={{ color: "white", fontWeight: "900" }}>Sending...</Text>
                  </View>
                ) : (
                  <Text style={{ color: "white", fontWeight: "900" }}>Send</Text>
                )}
              </Pressable>

              <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center" }}>
                Broadcast = All lorries • Specific = selected lorry only
              </Text>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ✅ CREATE LORRY MODAL */}
      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ marginTop: "auto" }}>
            <ScrollView
              style={{ maxHeight: "85%" }}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
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
                  <Text style={{ fontSize: 18, fontWeight: "900", color: THEME.text }}>Create Lorry</Text>
                  <Pressable onPress={() => setCreateOpen(false)}>
                    <Text style={{ fontWeight: "900", color: THEME.green }}>Close</Text>
                  </Pressable>
                </View>

                <Text style={{ color: THEME.muted }}>
                  මෙතනින් driver Auth account එකත් create වෙයි ✅
                </Text>

                {[
                  { ph: "Vehicle ID (ex: V2)", val: vehicleId, set: setVehicleId, cap: "characters" as const },
                  { ph: "Nickname", val: nickname, set: setNickname, cap: "none" as const },
                  { ph: "Route ID (ex: R1)", val: routeId, set: setRouteId, cap: "characters" as const },
                  { ph: "Description (optional)", val: description, set: setDescription, cap: "none" as const },
                ].map((f, idx) => (
                  <TextInput
                    key={idx}
                    placeholder={f.ph}
                    value={f.val}
                    onChangeText={f.set}
                    autoCapitalize={f.cap}
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
                ))}

                <Text style={{ fontWeight: "900", color: THEME.text }}>Driver Credentials</Text>

                <TextInput
                  placeholder="Driver Email"
                  value={driverEmail}
                  onChangeText={setDriverEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
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
                  placeholder="Driver Password (min 6)"
                  value={driverPassword}
                  onChangeText={setDriverPassword}
                  secureTextEntry
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

                <Pressable
                  onPress={createLorryAccount}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? "#86EFAC" : THEME.green2,
                    padding: 14,
                    borderRadius: 14,
                    alignItems: "center",
                  }}
                >
                  {saving ? (
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <ActivityIndicator color="white" />
                      <Text style={{ color: "white", fontWeight: "900" }}>Creating...</Text>
                    </View>
                  ) : (
                    <Text style={{ color: "white", fontWeight: "900" }}>Create</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
