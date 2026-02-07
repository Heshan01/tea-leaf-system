import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { onValue, ref, set, onDisconnect, update } from "firebase/database";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { auth, db, rtdb } from "../../lib/firebase";

type RouteDoc = { id: string; name?: string; description?: string };

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
  chip: "#F8FAFC",
  dark: "#111827",
};

export default function DriverHome() {
  const router = useRouter();
  const uid = auth.currentUser?.uid ?? null;

  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;

  const P = isTablet ? 22 : isSmall ? 12 : 16;
  const CARD_PAD = isTablet ? 18 : 14;

  const watcher = useRef<Location.LocationSubscription | null>(null);

  const [vehicleId, setVehicleId] = useState<string>("V1");
  const [routeId, setRouteId] = useState<string | null>(null);

  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  const [sharing, setSharing] = useState(false);
  const [presenceOk, setPresenceOk] = useState(false);

  // ✅ Map + Location UI states
  const mapRef = useRef<MapView | null>(null);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ✅ Load driver profile (vehicleId, routeId)
  useEffect(() => {
    if (!uid) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const data: any = snap.data();
          if (data.vehicleId) setVehicleId(String(data.vehicleId));
          if (data.routeId) setRouteId(String(data.routeId));
        }
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Driver profile load error");
      }
    })();
  }, [uid]);

  // ✅ Load routes list
  useEffect(() => {
    (async () => {
      try {
        setLoadingRoutes(true);
        const snap = await getDocs(collection(db, "routes"));
        const list: RouteDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setRoutes(list);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Routes load error");
      } finally {
        setLoadingRoutes(false);
      }
    })();
  }, []);

  // ✅ Presence (RTDB .info/connected + onDisconnect)
  useEffect(() => {
    if (!uid || !vehicleId) return;

    const connectedRef = ref(rtdb, ".info/connected");
    const presRef = ref(rtdb, `presence/vehicles/${vehicleId}`);

    const unsub = onValue(connectedRef, async (snap) => {
      if (snap.val() === true) {
        try {
          await onDisconnect(presRef).set({ online: false, lastSeen: Date.now() });
          await set(presRef, { online: true, lastSeen: Date.now(), driverUid: uid });
          setPresenceOk(true);
        } catch {
          setPresenceOk(false);
        }
      }
    });

    return () => unsub();
  }, [vehicleId, uid]);

  // ✅ Get initial location once (for map center)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;
        setMyLoc({ lat: latitude, lng: longitude });
      } catch {
        // ignore
      }
    })();
  }, []);

  // ✅ cleanup watcher + live node when screen unmount
  useEffect(() => {
    return () => {
      watcher.current?.remove();
      watcher.current = null;

      if (vehicleId) {
        try {
          set(ref(rtdb, `live/${vehicleId}`), null);
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const selectedRouteName = useMemo(() => {
    const r = routes.find((x) => x.id === routeId);
    return r?.name || routeId || "Not selected";
  }, [routes, routeId]);

  // ✅ Route select
  const selectRoute = async (rId: string) => {
    if (!uid) return;

    try {
      setRouteId(rId);

      await updateDoc(doc(db, "users", uid), { routeId: rId, vehicleId });

      await setDoc(
        doc(db, "vehicles", vehicleId),
        { routeId: rId, active: true, updatedAt: Date.now() },
        { merge: true }
      );

      await setDoc(
        doc(db, "routes", rId),
        { activeVehicleId: vehicleId, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Route update error");
    }
  };

  // ✅ Helper: animate map to lorry
  const focusOnLorry = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      400
    );
  };

  // ✅ Start sharing (with route check)
  const startSharing = async () => {
    if (!uid) return;

    if (!routeId) {
      Alert.alert("Route", "Route එක set කරලා නැහැ. Admin හෝ settings එකෙන් route assign කරන්න.");
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Location permission allow කරන්න");
      return;
    }

    watcher.current?.remove();
    watcher.current = null;

    setSharing(true);

    watcher.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 20 },
      async (loc) => {
        const { latitude, longitude, speed } = loc.coords;

        // ✅ update local state (map marker move)
        setMyLoc({ lat: latitude, lng: longitude });

        // ✅ write live position
        await set(ref(rtdb, `live/${vehicleId}`), {
          lat: latitude,
          lng: longitude,
          speed: speed ?? 0,
          updatedAt: Date.now(),
          driverUid: uid,
          routeId,
        });

        // ✅ presence heartbeat
        await update(ref(rtdb, `presence/vehicles/${vehicleId}`), {
          online: true,
          lastSeen: Date.now(),
          driverUid: uid,
        });

        // ✅ keep map following while sharing (optional)
        if (mapReady) focusOnLorry(latitude, longitude);
      }
    );
  };

  // ✅ Stop sharing (remove live/{vehicleId})
  const stopSharing = async () => {
    if (!uid) return;

    watcher.current?.remove();
    watcher.current = null;
    setSharing(false);

    try {
      await set(ref(rtdb, `live/${vehicleId}`), null);
    } catch {}

    try {
      await update(ref(rtdb, `presence/vehicles/${vehicleId}`), {
        online: true,
        lastSeen: Date.now(),
        driverUid: uid,
      });
    } catch {}
  };

  if (!uid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: P }}>
          <Text style={{ color: THEME.text, fontWeight: "900", fontSize: 16 }}>Not logged in</Text>
          <Text style={{ color: THEME.muted, marginTop: 6, textAlign: "center" }}>
            Please login again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const initialRegion: Region = {
    latitude: myLoc?.lat ?? 7.8731, // fallback Sri Lanka
    longitude: myLoc?.lng ?? 80.7718,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <ScrollView contentContainerStyle={{ padding: P, paddingBottom: 26, gap: 12 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: CARD_PAD,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: isTablet ? 22 : 20, fontWeight: "900", color: THEME.text }}>
                Driver Home
              </Text>
              <Text style={{ color: THEME.muted, marginTop: 4 }}>
                Vehicle: <Text style={{ color: THEME.text, fontWeight: "900" }}>{vehicleId}</Text> • Route:{" "}
                <Text style={{ color: THEME.text, fontWeight: "900" }}>{selectedRouteName}</Text>
              </Text>
            </View>

            <View
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: presenceOk ? THEME.greenSoft : THEME.chip,
                borderWidth: 1,
                borderColor: presenceOk ? "#86EFAC" : THEME.border,
              }}
            >
              <Text style={{ fontWeight: "900", color: presenceOk ? THEME.green : THEME.muted }}>
                {presenceOk ? "ONLINE" : "CONNECTING"}
              </Text>
            </View>
          </View>

          {/* Inbox quick action */}
          <Pressable
            onPress={() => router.push("/driver/inbox")}
            style={{
              backgroundColor: THEME.greenSoft,
              borderWidth: 1,
              borderColor: "#86EFAC",
              paddingVertical: Platform.OS === "ios" ? 14 : 12,
              paddingHorizontal: 14,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="mail-outline" size={18} color={THEME.green} />
              <Text style={{ fontWeight: "900", color: THEME.green }}>Open Inbox</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.green} />
          </Pressable>
        </View>

        {/* ✅ MAP CARD */}
        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: THEME.border,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: CARD_PAD, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontWeight: "900", color: THEME.text }}>Map</Text>
              <Text style={{ color: THEME.muted, marginTop: 2 }}>
                Your lorry position (live)
              </Text>
            </View>

            <Pressable
              onPress={() => {
                if (myLoc) focusOnLorry(myLoc.lat, myLoc.lng);
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: THEME.border,
                backgroundColor: "#F8FAFC",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="locate-outline" size={16} color={THEME.dark} />
              <Text style={{ fontWeight: "900", color: THEME.dark }}>Center</Text>
            </Pressable>
          </View>

          <View style={{ height: isTablet ? 360 : 260 }}>
            <MapView
             ref={mapRef}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              style={{ flex: 1 }}
              initialRegion={initialRegion}
              onMapReady={() => setMapReady(true)}
            >
              {/* ✅ Lorry Marker */}
              {myLoc && (
                <Marker
                  coordinate={{ latitude: myLoc.lat, longitude: myLoc.lng }}
                  title={`Lorry ${vehicleId}`}
                  description={sharing ? "LIVE sharing ON" : "Sharing OFF (last known)"}
                >
                  <View
                    style={{
                      backgroundColor: sharing ? THEME.green2 : "#94A3B8",
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: "white",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>🚚</Text>
                    <Text style={{ color: "white", fontWeight: "900" }}>{vehicleId}</Text>
                  </View>
                </Marker>
              )}
            </MapView>
          </View>

          <View style={{ padding: CARD_PAD, paddingTop: 10 }}>
            <Text style={{ color: THEME.muted }}>
              {myLoc
                ? `Lat: ${myLoc.lat.toFixed(6)}  •  Lng: ${myLoc.lng.toFixed(6)}`
                : "Location not available yet."}
            </Text>
          </View>
        </View>

        {/* Route Select */}
        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: CARD_PAD,
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "900", color: THEME.text }}>Select Today Route</Text>

          {loadingRoutes ? (
            <View style={{ alignItems: "center", gap: 10, paddingVertical: 10 }}>
              <ActivityIndicator />
              <Text style={{ color: THEME.muted }}>Loading routes...</Text>
            </View>
          ) : routes.length === 0 ? (
            <Text style={{ color: THEME.muted }}>
              Firestore → routes collection empty. Routes docs add කරන්න.
            </Text>
          ) : (
            routes.map((r) => {
              const active = r.id === routeId;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => selectRoute(r.id)}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: active ? "#86EFAC" : THEME.border,
                    backgroundColor: active ? THEME.greenSoft : "#F8FAFC",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", color: THEME.text }}>
                      {r.name ? `${r.name} (${r.id})` : r.id}
                    </Text>
                    {!!r.description && (
                      <Text style={{ color: THEME.muted, marginTop: 3 }} numberOfLines={2}>
                        {r.description}
                      </Text>
                    )}
                  </View>

                  <Text style={{ fontWeight: "900", color: active ? THEME.green : THEME.muted }}>
                    {active ? "Selected" : "Select"}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Location Sharing */}
        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: CARD_PAD,
            gap: 12,
          }}
        >
          <Text style={{ fontWeight: "900", color: THEME.text }}>Live Location</Text>
          <Text style={{ color: THEME.muted }}>Update interval: ~15 seconds (for a save the battery)</Text>

          {!sharing ? (
            <Pressable
              onPress={startSharing}
              style={{
                backgroundColor: THEME.green2,
                paddingVertical: Platform.OS === "ios" ? 14 : 12,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>Start Location Sharing</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={stopSharing}
              style={{
                backgroundColor: THEME.red,
                paddingVertical: Platform.OS === "ios" ? 14 : 12,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>Stop Sharing</Text>
            </Pressable>
          )}

          <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center" }}>
            Route select කරලා පස්සේ sharing start කරන්න ✅
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
