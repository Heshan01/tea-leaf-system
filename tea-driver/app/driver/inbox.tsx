import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  useWindowDimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  updateDoc,
  arrayUnion,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

type Msg = {
  id: string;
  targetType?: "all" | "vehicle";
  vehicleId?: string | null;
  title?: string | null;
  body?: string;
  createdAtMs?: number;
  readBy?: string[];
};

const THEME = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E5E7EB",
  green: "#166534",
  green2: "#22C55E",
  greenSoft: "#DCFCE7",
  chip: "#F8FAFC",
};

function fmtTime(ms?: number) {
  if (!ms) return "-";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "-";
  }
}

export default function DriverInbox() {
  const uid = auth.currentUser?.uid ?? null;

  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;
  const P = isTablet ? 22 : isSmall ? 12 : 16;

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);

  const [loading, setLoading] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "broadcast" | "vehicle">("all");

  // detail modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Msg | null>(null);

  // merge map for 2 realtime queries
  const mapRef = useRef<Record<string, Msg>>({});

  // ✅ Load driver vehicleId from users/{uid}
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        setLoadingVehicle(true);
        const snap = await getDoc(doc(db, "users", uid));
        const v = snap.exists() ? (snap.data() as any)?.vehicleId : null;
        setVehicleId(v ? String(v) : null);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to load driver profile");
        setVehicleId(null);
      } finally {
        setLoadingVehicle(false);
      }
    })();
  }, [uid]);

  // ✅ Realtime messages (Broadcast + My Vehicle)
  useEffect(() => {
    if (!uid || !vehicleId) return;

    setLoading(true);
    mapRef.current = {};

    const qBroadcast = query(
      collection(db, "messages"),
      where("targetType", "==", "all"),
      orderBy("createdAtMs", "desc"),
      limit(80)
    );

    const qVehicle = query(
      collection(db, "messages"),
      where("targetType", "==", "vehicle"),
      where("vehicleId", "==", vehicleId),
      orderBy("createdAtMs", "desc"),
      limit(80)
    );

    const applyMerge = () => {
      const merged = Object.values(mapRef.current).sort(
        (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)
      );
      setMsgs(merged);
      setLoading(false);
    };

    const unsub1 = onSnapshot(
      qBroadcast,
      (snap) => {
        // remove old broadcast items then re-add from snapshot
        snap.docChanges().forEach((c) => {
          if (c.type === "removed") delete mapRef.current[c.doc.id];
        });
        snap.docs.forEach((d) => {
          mapRef.current[d.id] = { id: d.id, ...(d.data() as any) };
        });
        applyMerge();
      },
      (err) => {
        setLoading(false);
        Alert.alert("Firestore Error", err.message);
      }
    );

    const unsub2 = onSnapshot(
      qVehicle,
      (snap) => {
        snap.docChanges().forEach((c) => {
          if (c.type === "removed") delete mapRef.current[c.doc.id];
        });
        snap.docs.forEach((d) => {
          mapRef.current[d.id] = { id: d.id, ...(d.data() as any) };
        });
        applyMerge();
      },
      (err) => {
        setLoading(false);
        Alert.alert("Firestore Error", err.message);
      }
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [uid, vehicleId]);

  // ✅ Refresh fallback (one-time fetch)
  const onRefresh = async () => {
    if (!uid || !vehicleId) return;
    try {
      setRefreshing(true);

      const list: Msg[] = [];
      const seen: Record<string, boolean> = {};

      const snap1 = await getDocs(
        query(
          collection(db, "messages"),
          where("targetType", "==", "all"),
          orderBy("createdAtMs", "desc"),
          limit(80)
        )
      );
      snap1.docs.forEach((d) => {
        seen[d.id] = true;
        list.push({ id: d.id, ...(d.data() as any) });
      });

      const snap2 = await getDocs(
        query(
          collection(db, "messages"),
          where("targetType", "==", "vehicle"),
          where("vehicleId", "==", vehicleId),
          orderBy("createdAtMs", "desc"),
          limit(80)
        )
      );
      snap2.docs.forEach((d) => {
        if (!seen[d.id]) list.push({ id: d.id, ...(d.data() as any) });
      });

      list.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      setMsgs(list);
    } catch (e: any) {
      Alert.alert("Refresh Error", e?.message ?? "Unknown error");
    } finally {
      setRefreshing(false);
    }
  };

  const unreadCount = useMemo(() => {
    if (!uid) return 0;
    return msgs.filter((m) => !(m.readBy ?? []).includes(uid)).length;
  }, [msgs, uid]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return msgs.filter((m) => {
      if (filter === "broadcast" && m.targetType !== "all") return false;
      if (filter === "vehicle" && m.targetType !== "vehicle") return false;

      if (!q) return true;
      const hay = `${m.title ?? ""} ${m.body ?? ""} ${m.vehicleId ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [msgs, search, filter]);

  const markAsRead = async (msgId: string) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "messages", msgId), {
        readBy: arrayUnion(uid),
      });
    } catch {
      // ignore
    }
  };

  const openMsg = async (m: Msg) => {
    setSelected(m);
    setOpen(true);
    await markAsRead(m.id);
  };

  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active ? THEME.greenSoft : THEME.chip,
        borderWidth: 1,
        borderColor: active ? "#86EFAC" : THEME.border,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Text style={{ color: active ? THEME.green : THEME.muted, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );

  // ✅ If not logged in
  if (!uid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ color: THEME.text, fontWeight: "900", fontSize: 16 }}>Not logged in</Text>
        <Text style={{ color: THEME.muted, marginTop: 6, textAlign: "center" }}>
          Please login again.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={{ padding: P, paddingBottom: 10, gap: 12 }}>
        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: isTablet ? 24 : 22, fontWeight: "900", color: THEME.text }}>
                Inbox
              </Text>
              <Text style={{ color: THEME.muted, marginTop: 2 }}>
                {loadingVehicle ? "Loading vehicle..." : `Vehicle: ${vehicleId ?? "Not set"}`}
              </Text>
            </View>

            <View
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: unreadCount > 0 ? THEME.greenSoft : THEME.chip,
                borderWidth: 1,
                borderColor: unreadCount > 0 ? "#86EFAC" : THEME.border,
              }}
            >
              <Text style={{ fontWeight: "900", color: unreadCount > 0 ? THEME.green : THEME.muted }}>
                Unread: {unreadCount}
              </Text>
            </View>
          </View>

          {/* Search */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#F8FAFC",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.border,
              paddingHorizontal: 12,
              paddingVertical: Platform.OS === "ios" ? 12 : 10,
              gap: 10,
            }}
          >
            <Ionicons name="search" size={18} color={THEME.muted} />
            <TextInput
              placeholder="Search messages..."
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, color: THEME.text }}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <Pressable onPress={onRefresh} style={{ padding: 6 }}>
              <Ionicons name="refresh" size={18} color={THEME.green} />
            </Pressable>
          </View>

          {/* Filters */}
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
            <Chip label="Broadcast" active={filter === "broadcast"} onPress={() => setFilter("broadcast")} />
            <Chip label="My Lorry" active={filter === "vehicle"} onPress={() => setFilter("vehicle")} />
          </View>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator />
          <Text style={{ color: THEME.muted }}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: P, paddingTop: 6, paddingBottom: 30, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View
              style={{
                backgroundColor: THEME.card,
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>No messages</Text>
              <Text style={{ color: THEME.muted }}>
                Admin broadcast හෝ vehicle message එවලා තිබුනොත් මෙතන පේනවා.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isUnread = !(item.readBy ?? []).includes(uid);
            const badge = item.targetType === "all" ? "📢 Broadcast" : "🚚 My Lorry";
            const time = fmtTime(item.createdAtMs);

            return (
              <Pressable
                onPress={() => openMsg(item)}
                style={{
                  backgroundColor: THEME.card,
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: isUnread ? "#86EFAC" : THEME.border,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={{ fontWeight: "900", color: THEME.text }}>{badge}</Text>
                      {isUnread ? (
                        <View
                          style={{
                            paddingVertical: 4,
                            paddingHorizontal: 10,
                            borderRadius: 999,
                            backgroundColor: THEME.greenSoft,
                            borderWidth: 1,
                            borderColor: "#86EFAC",
                          }}
                        >
                          <Text style={{ fontWeight: "900", color: THEME.green }}>NEW</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={{ fontSize: 15, fontWeight: "900", color: THEME.text }}>
                      {item.title ? item.title : "Message"}
                    </Text>

                    <Text style={{ color: THEME.muted }} numberOfLines={2}>
                      {item.body ?? ""}
                    </Text>

                    <Text style={{ color: "#94A3B8", fontSize: 12 }}>{time}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={THEME.green} />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Detail modal */}
      <Modal visible={open} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}>
          <View
            style={{
              marginTop: "auto",
              backgroundColor: "white",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: P,
              gap: 12,
              maxHeight: "85%",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: THEME.text }}>Message</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={{ fontWeight: "900", color: THEME.green }}>Close</Text>
              </Pressable>
            </View>

            {selected ? (
              <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
                <View
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 16,
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontWeight: "900", color: THEME.text }}>
                    {selected.targetType === "all" ? "📢 Broadcast" : "🚚 My Lorry"}
                  </Text>

                  <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>
                    {selected.title ? selected.title : "Message"}
                  </Text>

                  <Text style={{ color: THEME.muted }}>{fmtTime(selected.createdAtMs)}</Text>

                  <View style={{ height: 6 }} />

                  <Text style={{ color: THEME.text, lineHeight: 20 }}>
                    {selected.body ?? ""}
                  </Text>
                </View>

                <Pressable
                  onPress={async () => {
                    await markAsRead(selected.id);
                    Alert.alert("Done ✅", "Marked as read");
                  }}
                  style={{
                    backgroundColor: THEME.green2,
                    padding: 14,
                    borderRadius: 14,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>Mark as read</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <Text style={{ color: THEME.muted }}>No message selected</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
