// app/(tabs)/home.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import { onValue, ref } from "firebase/database";
import { auth, db, rtdb } from "../../lib/firebase";

type Vehicle = {
  id: string;
  nickname?: string;
  routeId?: string;
  description?: string;
  driverEmail?: string;
  driverUid?: string;
  createdAt?: number;
  active?: boolean;
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
  tealSoft: "#CCFBF1",
  redSoft: "#FEE2E2",
  redText: "#991B1B",
  tealText: "#0F766E",
  dark: "#111827",
};

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isSmall = width < 360;
  const isTablet = width >= 768;

  const P = isTablet ? 22 : isSmall ? 12 : 16;
  const RADIUS = isTablet ? 22 : 18;
  const CARD_PAD = isTablet ? 18 : isSmall ? 12 : 14;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [liveIds, setLiveIds] = useState<Record<string, boolean>>({});
  const [onlineIds, setOnlineIds] = useState<Record<string, boolean>>({});
  const [usersOnlineCount, setUsersOnlineCount] = useState<number | null>(null);

  const adminUid = auth.currentUser?.uid ?? null;

  useEffect(() => {
    setLoading(true);

    const unsub = onSnapshot(
      collection(db, "vehicles"),
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

  useEffect(() => {
    const liveRef = ref(rtdb, "live");
    const unsub = onValue(liveRef, (snap) => {
      const data = snap.val() || {};
      const mapped: Record<string, boolean> = {};
      Object.keys(data).forEach((k) => {
        mapped[k] = true;
      });
      setLiveIds(mapped);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const pRef = ref(rtdb, "presence/vehicles");
    const unsub = onValue(pRef, (snap) => {
      const data = snap.val() || {};
      const mapped: Record<string, boolean> = {};
      Object.keys(data).forEach((k) => {
        mapped[k] = !!data[k]?.online;
      });
      setOnlineIds(mapped);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const uRef = ref(rtdb, "presence/users");
    const unsub = onValue(
      uRef,
      (snap) => {
        const data = snap.val() || {};
        let count = 0;
        Object.keys(data).forEach((k) => {
          if (data[k]?.online) count += 1;
        });
        setUsersOnlineCount(count);
      },
      () => setUsersOnlineCount(null)
    );
    return () => unsub();
  }, []);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const liveCount = Object.keys(liveIds).length;
    let onlineCount = 0;
    Object.keys(onlineIds).forEach((k) => {
      if (onlineIds[k]) onlineCount += 1;
    });
    return { total, liveCount, onlineCount };
  }, [vehicles, liveIds, onlineIds]);

  const liveNow = useMemo(() => {
    const withStatus = vehicles.map((v) => ({
      ...v,
      isLive: !!liveIds[v.id],
      isOnline: !!onlineIds[v.id],
    }));

    withStatus.sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });

    return withStatus.slice(0, 6);
  }, [vehicles, liveIds, onlineIds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const goLorries = () => router.push("/(tabs)/lorries");
  const goDetails = (id: string) => router.push({ pathname: "/(tabs)/lorry/[id]", params: { id } });
  const goBroadcast = () => router.push({ pathname: "/(tabs)/lorries", params: { broadcast: "1" } });

  const badge = (isLive: boolean, isOnline: boolean) => {
    const bg = isLive ? THEME.greenSoft : isOnline ? THEME.tealSoft : THEME.redSoft;
    const text = isLive ? THEME.green : isOnline ? THEME.tealText : THEME.redText;
    const label = isLive ? "LIVE" : isOnline ? "ONLINE" : "OFFLINE";
    return { bg, text, label };
  };

  const StatCard = ({
    title,
    value,
    icon,
    tint,
  }: {
    title: string;
    value: string | number;
    icon: any;
    tint: string;
  }) => (
    <View
      style={{
        flex: 1,
        backgroundColor: THEME.card,
        borderRadius: RADIUS,
        borderWidth: 1,
        borderColor: THEME.border,
        padding: CARD_PAD,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: isTablet ? 44 : 40,
            height: isTablet ? 44 : 40,
            borderRadius: 999,
            backgroundColor: tint,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name={icon} size={20} color={THEME.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: THEME.muted, fontWeight: "700" }}>{title}</Text>
          <Text style={{ color: THEME.text, fontWeight: "900", fontSize: isTablet ? 22 : 20 }}>{value}</Text>
        </View>
      </View>
    </View>
  );

  if (!adminUid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: P }}>
          <Text style={{ fontWeight: "900", fontSize: 16, color: THEME.text }}>Not logged in</Text>
          <Text style={{ color: THEME.muted, marginTop: 8, textAlign: "center" }}>Please login first.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: P, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: CARD_PAD,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: isTablet ? 22 : 20, fontWeight: "900", color: THEME.text }}>
                Admin Dashboard
              </Text>
              <Text style={{ color: THEME.muted, marginTop: 4 }}>Tea Leaf System • Live Tracking & Messaging</Text>
            </View>

            <Pressable
              onPress={() => Alert.alert("Tea Leaf ✅", "Dashboard is working ✅")}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: THEME.greenSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="leaf" size={22} color={THEME.green} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <Pressable
              onPress={goLorries}
              style={{
                flex: 1,
                backgroundColor: THEME.green2,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>Manage Lorries</Text>
            </Pressable>

            <Pressable
              onPress={onRefresh}
              style={{
                width: 56,
                backgroundColor: THEME.dark,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="refresh" size={20} color="white" />
            </Pressable>
          </View>

          <Pressable
            onPress={goBroadcast}
            style={{
              backgroundColor: THEME.greenSoft,
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
              marginTop: 10,
              borderWidth: 1,
              borderColor: "#86EFAC",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="megaphone-outline" size={18} color={THEME.green} />
            <Text style={{ color: THEME.green, fontWeight: "900" }}>Send Broadcast Message</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 24 }}>
            <ActivityIndicator />
            <Text style={{ color: THEME.muted, marginTop: 10 }}>Loading stats...</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: isTablet ? "row" : "column" }}>
              <StatCard title="Total Lorries" value={stats.total} icon="car" tint={THEME.greenSoft} />
              {isTablet ? <View style={{ width: 12 }} /> : null}
              <StatCard title="LIVE Now" value={stats.liveCount} icon="navigate" tint={THEME.tealSoft} />
            </View>

            <View style={{ flexDirection: isTablet ? "row" : "column" }}>
              <StatCard title="Online (Presence)" value={stats.onlineCount} icon="wifi" tint={THEME.greenSoft} />
              {isTablet ? <View style={{ width: 12 }} /> : null}
              <StatCard title="Users Online" value={usersOnlineCount ?? "-"} icon="people" tint={THEME.tealSoft} />
            </View>
          </>
        )}

        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: CARD_PAD,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Ionicons name="flash" size={18} color={THEME.green} />
            <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: "900", color: THEME.text }}>Live Now</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={goLorries} style={{ padding: 6 }}>
              <Text style={{ color: THEME.green, fontWeight: "900" }}>View all</Text>
            </Pressable>
          </View>

          {liveNow.length === 0 ? (
            <Text style={{ color: THEME.muted }}>No lorries yet. Add a lorry in Lorries tab.</Text>
          ) : (
            liveNow.map((v) => {
              const b = badge(!!liveIds[v.id], !!onlineIds[v.id]);

              return (
                <Pressable
                  key={v.id}
                  onPress={() => goDetails(v.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 16,
                    padding: 12,
                    marginBottom: 10,
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "900", color: THEME.text }} numberOfLines={1}>
                        {v.id} — {v.nickname ?? v.id}
                      </Text>
                      <Text style={{ color: THEME.muted, marginTop: 4 }} numberOfLines={1}>
                        Route: {v.routeId ?? "-"} • {v.description ?? "No description"}
                      </Text>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: b.bg,
                        marginLeft: 10,
                      }}
                    >
                      <Text style={{ color: b.text, fontWeight: "900" }}>{b.label}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                    <Ionicons name="chevron-forward" size={18} color={THEME.green} />
                    <Text style={{ color: THEME.green, fontWeight: "900", marginLeft: 6 }}>Open details</Text>
                  </View>
                </Pressable>
              );
            })
          )}

          <Text style={{ color: THEME.muted, fontSize: 12, textAlign: "center", marginTop: 6 }}>
            Tip: LIVE = location updates (RTDB live). ONLINE = presence only.
          </Text>
        </View>

        <View style={{ height: Platform.OS === "ios" ? 6 : 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
