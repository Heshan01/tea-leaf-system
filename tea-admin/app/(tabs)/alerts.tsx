import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  limit,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

type AlertDoc = {
  id: string;
  type: "breakdown" | "delay" | "note" | "emergency";
  message: string;
  createdAtMs?: number;
  status?: "new" | "seen" | "resolved";
  driverUid?: string;
  vehicleId?: string | null;
  routeId?: string | null;
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
  redSoft: "#FEE2E2",
  redText: "#991B1B",
  dark: "#111827",
  chip: "#F8FAFC",
};

function fmt(ms?: number) {
  if (!ms) return "-";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "-";
  }
}

export default function AdminAlerts() {
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;
  const P = isTablet ? 22 : isSmall ? 12 : 16;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<AlertDoc[]>([]);

  useEffect(() => {
    setLoading(true);

    const qy = query(
      collection(db, "alerts"),
      orderBy("createdAtMs", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list: AlertDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setItems(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        Alert.alert("Firestore Error", err.message);
      }
    );

    return () => unsub();
  }, []);

  const newCount = useMemo(() => items.filter((a) => (a.status ?? "new") === "new").length, [items]);

  const markSeen = async (id: string) => {
    try {
      await updateDoc(doc(db, "alerts", id), { status: "seen" });
    } catch {}
  };

  const resolve = async (id: string) => {
    try {
      await updateDoc(doc(db, "alerts", id), { status: "resolved", resolvedAtMs: Date.now() });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Update error");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const badge = (a: AlertDoc) => {
    const t = a.type;
    if (t === "breakdown") return { bg: "#FEE2E2", text: "#991B1B", label: "Breakdown" };
    if (t === "delay") return { bg: "#FEF9C3", text: "#92400E", label: "Delay" };
    if (t === "emergency") return { bg: "#FFE4E6", text: "#9F1239", label: "Emergency" };
    return { bg: THEME.greenSoft, text: THEME.green, label: "Note" };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: isTablet ? 24 : 22, fontWeight: "900", color: THEME.text }}>
                Alerts
              </Text>
              <Text style={{ color: THEME.muted, marginTop: 2 }}>
                New: {newCount} • Total: {items.length}
              </Text>
            </View>

            <View
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: newCount > 0 ? THEME.redSoft : THEME.chip,
                borderWidth: 1,
                borderColor: newCount > 0 ? "#FCA5A5" : THEME.border,
              }}
            >
              <Text style={{ fontWeight: "900", color: newCount > 0 ? THEME.redText : THEME.muted }}>
                {newCount > 0 ? "URGENT" : "OK"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator />
          <Text style={{ color: THEME.muted }}>Loading alerts...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: P, paddingTop: 6, gap: 12, paddingBottom: 26 }}
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
              <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>No alerts</Text>
              <Text style={{ color: THEME.muted }}>Driver alerts මෙතන realtime පේනවා.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const b = badge(item);
            const status = item.status ?? "new";

            return (
              <Pressable
                onPress={() => markSeen(item.id)}
                style={{
                  backgroundColor: THEME.card,
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: status === "new" ? "#FCA5A5" : THEME.border,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <View
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          backgroundColor: b.bg,
                          borderWidth: 1,
                          borderColor: THEME.border,
                        }}
                      >
                        <Text style={{ fontWeight: "900", color: b.text }}>{b.label}</Text>
                      </View>

                      <Text style={{ color: THEME.muted, fontWeight: "800" }}>
                        {status.toUpperCase()}
                      </Text>
                    </View>

                    <Text style={{ color: THEME.text, fontWeight: "900" }}>
                      {item.vehicleId ?? "-"} • Route: {item.routeId ?? "-"}
                    </Text>

                    <Text style={{ color: THEME.muted }}>{item.message}</Text>

                    <Text style={{ color: "#94A3B8", fontSize: 12 }}>
                      {fmt(item.createdAtMs)} • Driver: {item.driverUid ?? "-"}
                    </Text>

                    <Pressable
                      onPress={() => resolve(item.id)}
                      style={{
                        backgroundColor: THEME.dark,
                        paddingVertical: Platform.OS === "ios" ? 12 : 10,
                        borderRadius: 12,
                        alignItems: "center",
                        marginTop: 6,
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "900" }}>Mark as Resolved</Text>
                    </Pressable>
                  </View>

                  <Ionicons name="alert-circle" size={20} color={b.text} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
