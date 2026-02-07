// app/(tabs)/home.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import MiniMap from "../../components/MiniMap";
import theme from "../../constants/theme";
import { auth, rtdb } from "../../lib/firebase";
import { setupPresence } from "../../lib/presence";
import { useUserContext } from "../../lib/useUserContext";

export default function Home() {
  const { uid, routeId, vehicleId } = useUserContext();
  const [pos, setPos] = useState<any>(null);

  useEffect(() => {
    if (!uid) return;
    return setupPresence(uid);
  }, [uid]);

  useEffect(() => {
    if (!vehicleId) {
      setPos(null);
      return;
    }
    const r = ref(rtdb, `live/${vehicleId}`);
    const unsub = onValue(r, (snap) => (snap.exists() ? setPos(snap.val()) : setPos(null)));
    return () => unsub();
  }, [vehicleId]);

  const openMaps = () => {
    if (!pos) return;
    Linking.openURL(`https://www.google.com/maps?q=${pos.lat},${pos.lng}`);
  };

  const updatedText = useMemo(() => {
    if (!pos?.updatedAt) return "—";
    try {
      return new Date(pos.updatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }, [pos]);

  // ✅ Speed format: "20.0" km/h (always 1 decimal)
  const speedText = useMemo(() => {
    const s = typeof pos?.speed === "number" ? pos.speed : Number(pos?.speed ?? 0);
    return Number.isFinite(s) ? s.toFixed(1) : "0.0";
  }, [pos]);

  const doLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  if (!uid) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          padding: 24,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="lock-closed-outline" size={64} color={theme.colors.muted} />
        <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 16, fontSize: 16 }}>
          Not signed in.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: "900", color: theme.colors.primary }}>Tea Explorer</Text>
          <Text style={{ fontSize: 14, color: theme.colors.muted }}>Tracking your logistics</Text>
        </View>

        <Pressable
          onPress={doLogout}
          style={({ pressed }) => ({
            padding: 10,
            borderRadius: theme.radius.md,
            backgroundColor: pressed ? theme.colors.border : theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
          })}
        >
          <Ionicons name="log-out-outline" size={24} color={theme.colors.danger} />
        </Pressable>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          padding: 20,
          flexDirection: "row",
          justifyContent: "space-between",
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View>
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12,
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            Current Route
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.primary, marginTop: 4 }}>
            {routeId ?? "No Assigned Route"}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12,
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            Vehicle
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.text, marginTop: 4 }}>
            {vehicleId ?? "—"}
          </Text>
        </View>
      </View>

      {pos ? (
        <>
          <View
            style={{
              borderRadius: theme.radius.lg,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: theme.colors.border,
              height: 250,
              backgroundColor: theme.colors.card,
            }}
          >
            <MiniMap lat={pos.lat} lng={pos.lng} title={`Vehicle ${vehicleId}`} />
          </View>

          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: theme.radius.lg,
              padding: 20,
              gap: 12,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="speedometer-outline" size={20} color={theme.colors.accent} />
                <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
                  Current Speed
                </Text>
              </View>

              <Text style={{ fontSize: 22, fontWeight: "900", color: theme.colors.primary }}>
                {speedText}{" "}
                <Text style={{ fontSize: 12, color: theme.colors.muted }}>km/h</Text>
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: theme.colors.border }} />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Latitude</Text>
                <Text style={{ fontWeight: "700", color: theme.colors.text }}>
                  {Number(pos.lat).toFixed(6)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Longitude</Text>
                <Text style={{ fontWeight: "700", color: theme.colors.text }}>
                  {Number(pos.lng).toFixed(6)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="time-outline" size={14} color={theme.colors.muted} />
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Last updated: {updatedText}</Text>
            </View>

            <Pressable
              onPress={openMaps}
              style={({ pressed }) => ({
                backgroundColor: pressed ? theme.colors.primary : theme.colors.dark,
                padding: 16,
                borderRadius: theme.radius.md,
                marginTop: 8,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
              })}
            >
              <Ionicons name="map" size={20} color="white" />
              <Text style={{ color: "white", textAlign: "center", fontWeight: "900", fontSize: 16 }}>
                Live View on Maps
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            padding: 40,
            alignItems: "center",
            justifyContent: "center",
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: theme.colors.border,
          }}
        >
          <Ionicons name="navigate-outline" size={48} color={theme.colors.border} />
          <Text style={{ color: theme.colors.muted, marginTop: 16, textAlign: "center", fontWeight: "600" }}>
            Waiting for live tracking data...
          </Text>
        </View>
      )}

      <View style={{ alignItems: "center", marginTop: 20, marginBottom: 10 }}>
        <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "600" }}>
          v2.0 Premium Upgrade 2026
        </Text>
      </View>
    </ScrollView>
  );
}
