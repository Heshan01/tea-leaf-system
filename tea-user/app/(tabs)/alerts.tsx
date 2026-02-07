// app/(tabs)/alerts.tsx
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import theme from "../../constants/theme";
import { db } from "../../lib/firebase";
import { useUserContext } from "../../lib/useUserContext";

type AlertDoc = {
  id: string;
  message?: string;
  type?: string;
  status?: string;
  routeId?: string;
  vehicleId?: string;
  createdAtMs?: number;
  resolvedAtMs?: number;
};

export default function Alerts() {
  const { routeId, vehicleId } = useUserContext();
  const [items, setItems] = useState<AlertDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const filtersReady = useMemo(() => !!routeId || !!vehicleId, [routeId, vehicleId]);

  const load = async () => {
    if (!filtersReady) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const base = collection(db, "alerts");
      const q1 = routeId ? query(base, where("routeId", "==", routeId)) : null;
      const q2 = vehicleId ? query(base, where("vehicleId", "==", vehicleId)) : null;

      const res: AlertDoc[] = [];

      if (q1) {
        const snap = await getDocs(q1);
        snap.forEach((d) => res.push({ id: d.id, ...(d.data() as any) }));
      }
      if (q2) {
        const snap = await getDocs(q2);
        snap.forEach((d) => res.push({ id: d.id, ...(d.data() as any) }));
      }

      const map = new Map<string, AlertDoc>();
      res.forEach((a) => map.set(a.id, a));
      const merged = Array.from(map.values()).sort(
        (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)
      );

      setItems(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [routeId, vehicleId]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "900", color: theme.colors.primary }}>Alert Center</Text>
        <Text style={{ fontSize: 14, color: theme.colors.muted, marginTop: 4 }}>
          Monitor events and system updates
        </Text>
      </View>

      {!filtersReady && (
        <View style={{ flex: 1, padding: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="filter-outline" size={48} color={theme.colors.border} />
          <Text style={{ color: theme.colors.muted, marginTop: 16, textAlign: "center", fontWeight: "600" }}>
            No route or vehicle linked to your account yet.
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListEmptyComponent={filtersReady && !loading ? (
          <View style={{ padding: 40, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.accent} />
            <Text style={{ color: theme.colors.muted, marginTop: 16, textAlign: "center", fontWeight: "600" }}>All systems clear</Text>
          </View>
        ) : null}
        renderItem={({ item }) => {
          const time = item.createdAtMs ? new Date(item.createdAtMs).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : "—";
          const isResolved = item.status === "resolved";
          const badgeColor = isResolved ? theme.colors.success : theme.colors.accent;

          return (
            <View
              style={{
                backgroundColor: theme.colors.white,
                borderRadius: theme.radius.lg,
                padding: 18,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
                borderLeftWidth: 4,
                borderLeftColor: badgeColor,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons
                    name={isResolved ? "checkmark-circle" : "warning"}
                    size={16}
                    color={badgeColor}
                  />
                  <Text style={{ fontWeight: "900", color: theme.colors.primary, textTransform: "uppercase", fontSize: 13, letterSpacing: 0.5 }}>
                    {item.type ?? "System Alert"}
                  </Text>
                </View>
                <View style={{ backgroundColor: isResolved ? "#ECFDF5" : "#F0FDF4", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontWeight: "800", color: badgeColor, fontSize: 10, textTransform: "uppercase" }}>
                    {item.status ?? "Open"}
                  </Text>
                </View>
              </View>

              <Text style={{ color: theme.colors.text, fontSize: 16, lineHeight: 22, fontWeight: "500" }}>{item.message ?? "No message detail provided."}</Text>

              <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="map-outline" size={12} color={theme.colors.muted} />
                    <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: "600" }}>{item.routeId ?? "All"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="bus-outline" size={12} color={theme.colors.muted} />
                    <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: "600" }}>{item.vehicleId ?? "—"}</Text>
                  </View>
                </View>
                <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{time}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

