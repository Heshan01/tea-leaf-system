import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { onDisconnect, onValue, ref, remove, set, update } from "firebase/database";
import { addDoc, collection, doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LiveMap from "../../components/LiveMap";
import { COLORS, SHADOWS, SIZES } from "../../constants/Theme";
import { auth, db, rtdb } from "../../lib/firebase";

function initials(name: string) {
  const n = (name || "").trim();
  if (!n) return "D";
  const parts = n.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type AlertType = "breakdown" | "delay" | "emergency" | "note";

export default function Home() {
  const uid = auth.currentUser?.uid || "";
  const { width } = useWindowDimensions();

  const isSmall = width < 360;
  const isTablet = width >= 768;

  const P = SIZES.padding;
  const mapH = useMemo(() => (isTablet ? 400 : isSmall ? 280 : 320), [isTablet, isSmall]);

  const watcher = useRef<Location.LocationSubscription | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);

  // Admin sets these (users/{uid})
  const [driverName, setDriverName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [imgOk, setImgOk] = useState(true);

  const [vehicleId, setVehicleId] = useState<string>("V1");
  const [routeId, setRouteId] = useState<string | null>(null);

  const [sharing, setSharing] = useState(false);
  const [presenceOk, setPresenceOk] = useState(false);

  const [pos, setPos] = useState<any>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [updating, setUpdating] = useState(false);

  // Alert modal
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>("breakdown");
  const [alertText, setAlertText] = useState("");
  const [sendingAlert, setSendingAlert] = useState(false);

  // ✅ Load driver profile (Admin created data)
  useEffect(() => {
    (async () => {
      try {
        setLoadingProfile(true);
        if (!uid) return;

        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const d: any = snap.data();

          setDriverName(d?.name ? String(d.name) : "");
          setPhotoUrl(d?.photoUrl ? String(d.photoUrl) : "");
          setImgOk(true);

          if (d?.vehicleId) setVehicleId(String(d.vehicleId));
          if (d?.routeId) setRouteId(String(d.routeId));
        }
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Profile load error");
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [uid]);

  // ✅ Presence (online/offline)
  useEffect(() => {
    if (!vehicleId || !uid) return;

    const connectedRef = ref(rtdb, ".info/connected");
    const presRef = ref(rtdb, `presence/vehicles/${vehicleId}`);

    const unsub = onValue(connectedRef, async (snap) => {
      if (snap.val() === true) {
        try {
          // app/network drop -> offline
          await onDisconnect(presRef).update({ online: false, lastSeen: Date.now() });
          await update(presRef, { online: true, lastSeen: Date.now(), driverUid: uid });
          setPresenceOk(true);
        } catch {
          setPresenceOk(false);
        }
      }
    });

    return () => unsub();
  }, [vehicleId, uid]);

  // ✅ Listen live location for this vehicle (for map)
  useEffect(() => {
    if (!vehicleId) return;

    const liveRef = ref(rtdb, `live/${vehicleId}`);
    const unsub = onValue(liveRef, (snap) => {
      const v = snap.exists() ? snap.val() : null;
      setPos(v);

      // ✅ sharing state = live node exists (so app reopen -> correct)
      setSharing(!!v);
    });

    return () => unsub();
  }, [vehicleId]);

  // ✅ Start location sharing (FIXED: onDisconnect remove live + safe)
  const startSharing = async () => {
    if (!routeId) {
      Alert.alert("Route", "Route එක set කරලා නැහැ. Admin හෝ settings එකෙන් route assign කරන්න.");
      return;
    }
    if (!uid) {
      Alert.alert("Login", "User not logged in");
      return;
    }

    // already sharing -> ignore
    if (watcher.current) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Location permission allow කරන්න");
      return;
    }

    setSharing(true);

    const liveRef = ref(rtdb, `live/${vehicleId}`);
    const presRef = ref(rtdb, `presence/vehicles/${vehicleId}`);

    // ✅ IMPORTANT: crash/net drop -> live auto remove (Admin LIVE won't stuck)
    try {
      await onDisconnect(liveRef).remove();
      await onDisconnect(presRef).update({ online: false, lastSeen: Date.now() });
    } catch {
      // ignore
    }

    watcher.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 20 },
      async (loc) => {
        const { latitude, longitude, speed } = loc.coords;

        try {
          await set(liveRef, {
            lat: latitude,
            lng: longitude,
            speed: speed ?? 0,
            updatedAt: Date.now(),
            driverUid: uid,
            routeId,
          });

          await update(presRef, {
            online: true,
            lastSeen: Date.now(),
            driverUid: uid,
          });
        } catch {
          // ignore
        }
      }
    );
  };

  // ✅ Stop sharing (FIXED: remove live immediately)
  const stopSharing = async () => {
    watcher.current?.remove();
    watcher.current = null;
    setSharing(false);

    // ✅ STOP pressed -> remove live right now
    try {
      await remove(ref(rtdb, `live/${vehicleId}`));
    } catch {
      // ignore
    }

    // presence stays online (driver still in app)
    try {
      await update(ref(rtdb, `presence/vehicles/${vehicleId}`), {
        online: true,
        lastSeen: Date.now(),
        driverUid: uid,
      });
    } catch {
      // ignore
    }
  };

  // ✅ Open edit sheet
  const openEdit = () => {
    setEditName(driverName);
    setEditPhoto(photoUrl);
    setEditOpen(true);
  };

  // ✅ Update profile (edit sheet only)
  const updateProfile = async () => {
    try {
      if (!uid) return;

      setUpdating(true);

      await setDoc(
        doc(db, "users", uid),
        {
          name: editName.trim(),
          photoUrl: editPhoto.trim(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      setDriverName(editName.trim());
      setPhotoUrl(editPhoto.trim());
      setImgOk(true);

      setEditOpen(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Update error");
    } finally {
      setUpdating(false);
    }
  };

  // ✅ Send urgent alert to admin (Firestore: alerts collection)
  const sendAlert = async () => {
    try {
      if (!uid) return;

      const msg = alertText.trim();
      if (!msg) {
        Alert.alert("Message", "පණිවිඩය ටිකක් ලියන්න");
        return;
      }

      setSendingAlert(true);

      await addDoc(collection(db, "alerts"), {
        type: alertType,
        message: msg,
        createdAtMs: Date.now(),
        driverUid: uid,
        vehicleId: vehicleId || null,
        routeId: routeId || null,
        status: "new",
      });

      setAlertText("");
      setAlertOpen(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send alert");
    } finally {
      setSendingAlert(false);
    }
  };

  const driverTitle = driverName?.trim() ? driverName.trim() : "Driver";
  const onlineLabel = presenceOk ? "Online (Presence)" : "Offline";
  const shareLabel = sharing ? "LIVE Now" : "Not Sharing";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: P, paddingBottom: 26, gap: 16 }}>
          {/* Header Dashboard Card */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: SIZES.radius,
              padding: 20,
              ...SHADOWS.medium,
            }}
          >
            {/* Top Row: Title + Icon */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: SIZES.h2, fontWeight: "800", color: COLORS.text }}>
                  Driver Dashboard
                </Text>
                <Text style={{ color: COLORS.textLight, fontSize: SIZES.small, marginTop: 4 }}>
                  Tea Leaf System • Route {routeId ?? "--"}
                </Text>
              </View>
              <View style={{
                width: 40, height: 40,
                borderRadius: 12,
                backgroundColor: COLORS.primarySoft,
                alignItems: "center", justifyContent: "center"
              }}>
                <Ionicons name="leaf" size={24} color={COLORS.primary} />
              </View>
            </View>

            {/* Main Action Button */}
            {!sharing ? (
              <Pressable
                onPress={startSharing}
                style={({ pressed }) => ({
                  backgroundColor: COLORS.primary,
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  opacity: pressed ? 0.9 : 1,

                })}
              >
                <Ionicons name="navigate-circle" size={24} color="white" />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>GO ONLINE (Start Sharing)</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={stopSharing}
                style={({ pressed }) => ({
                  backgroundColor: COLORS.text, // Dark button for stop
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <ActivityIndicator color="white" size="small" />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>STOP SHARING</Text>
              </Pressable>
            )}

            {/* Stats Row */}
            <View style={{ flexDirection: "row", marginTop: 20, gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 12, borderRadius: 12, alignItems: "center" }}>
                <Ionicons name="radio" size={20} color={sharing ? COLORS.primary : COLORS.textLight} />
                <Text style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>Status</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: sharing ? COLORS.primary : COLORS.text }}>{shareLabel}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 12, borderRadius: 12, alignItems: "center" }}>
                <Ionicons name="wifi" size={20} color={presenceOk ? COLORS.primary : COLORS.error} />
                <Text style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>Connection</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: presenceOk ? COLORS.primary : COLORS.text }}>{onlineLabel}</Text>
              </View>
            </View>
          </View>

          {/* User Profile Card */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: SIZES.radius,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              ...SHADOWS.small,
            }}
          >
            <View
              style={{
                width: 56, height: 56,
                borderRadius: 999,
                backgroundColor: COLORS.primarySoft,
                borderWidth: 2,
                borderColor: COLORS.background,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {photoUrl?.trim() && imgOk ? (
                <Image
                  source={{ uri: photoUrl.trim() }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                  onError={() => setImgOk(false)}
                />
              ) : (
                <Text style={{ fontWeight: "800", color: COLORS.primary, fontSize: 20 }}>
                  {initials(driverTitle)}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>{driverTitle}</Text>
              <Text style={{ color: COLORS.textLight, fontSize: 13 }}>Vehicle ID: {vehicleId}</Text>
            </View>

            <Pressable
              onPress={openEdit}
              style={{
                padding: 8,
                backgroundColor: COLORS.background,
                borderRadius: 8,
              }}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.text} />
            </Pressable>
          </View>

          {/* Quick Alerts Section */}
          <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text, marginLeft: 4 }}>Quick Alerts</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => {
                setAlertType("breakdown");
                setAlertText("");
                setAlertOpen(true);
              }}
              style={{
                flexGrow: 1,
                minWidth: "30%",
                backgroundColor: COLORS.card,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                ...SHADOWS.small,
                borderWidth: 1,
                borderColor: COLORS.background
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.errorBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="construct" size={20} color={COLORS.error} />
              </View>
              <Text style={{ fontWeight: "600", color: COLORS.text, fontSize: 13 }}>Breakdown</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setAlertType("delay");
                setAlertText("");
                setAlertOpen(true);
              }}
              style={{
                flexGrow: 1,
                minWidth: "30%",
                backgroundColor: COLORS.card,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                ...SHADOWS.small,
                borderWidth: 1,
                borderColor: COLORS.background
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.warningBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="time" size={20} color={COLORS.warning} />
              </View>
              <Text style={{ fontWeight: "600", color: COLORS.text, fontSize: 13 }}>Delay</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setAlertType("note");
                setAlertText("");
                setAlertOpen(true);
              }}
              style={{
                flexGrow: 1,
                minWidth: "30%",
                backgroundColor: COLORS.card,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                ...SHADOWS.small,
                borderWidth: 1,
                borderColor: COLORS.background
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
              </View>
              <Text style={{ fontWeight: "600", color: COLORS.text, fontSize: 13 }}>Note</Text>
            </Pressable>
          </View>


          {/* Full Live Map Card */}
          <View style={{
            borderRadius: SIZES.radius,
            overflow: 'hidden',
            ...SHADOWS.medium,
            backgroundColor: COLORS.card,
            marginTop: 4
          }}>
            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700', color: COLORS.text }}>Live Location</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sharing ? COLORS.primary : COLORS.textLight }} />
                <Text style={{ fontSize: 12, color: COLORS.textLight }}>{sharing ? "Updating" : "Paused"}</Text>
              </View>
            </View>
            <LiveMap
              title={`Vehicle ${vehicleId}`}
              lat={pos?.lat}
              lng={pos?.lng}
              height={mapH}
              follow={true}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ✅ Edit Driver Details (bottom sheet) */}
      <Modal visible={editOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setEditOpen(false)} />
          <View
            style={{
              backgroundColor: COLORS.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              gap: 16,
              ...SHADOWS.large,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.text }}>Edit Profile</Text>
              <Pressable onPress={() => setEditOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={COLORS.textLight} />
              </Pressable>
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 6 }}>Driver Name</Text>
              <TextInput
                placeholder="Your Name"
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor={COLORS.textLight}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: COLORS.background,
                  color: COLORS.text,
                  fontSize: 16,
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 6 }}>Profile Image URL</Text>
              <TextInput
                placeholder="https://..."
                value={editPhoto}
                onChangeText={setEditPhoto}
                autoCapitalize="none"
                placeholderTextColor={COLORS.textLight}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: COLORS.background,
                  color: COLORS.text,
                  fontSize: 16,
                }}
              />
            </View>

            <Pressable
              onPress={updateProfile}
              disabled={updating}
              style={{
                backgroundColor: updating ? COLORS.primarySoft : COLORS.primary,
                padding: 16,
                borderRadius: 14,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              {updating ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ✅ Alert / Announcement (bottom sheet) */}
      <Modal visible={alertOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setAlertOpen(false)} />
          <View
            style={{
              backgroundColor: COLORS.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              gap: 16,
              ...SHADOWS.large,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40, height: 40,
                  borderRadius: 12,
                  backgroundColor: alertType === 'breakdown' || alertType === 'emergency' ? COLORS.errorBg : alertType === 'delay' ? COLORS.warningBg : COLORS.primarySoft,
                  alignItems: "center", justifyContent: "center"
                }}>
                  <Ionicons
                    name={alertType === 'breakdown' ? 'construct' : alertType === 'delay' ? 'time' : 'chatbubble'}
                    size={24}
                    color={alertType === 'breakdown' || alertType === 'emergency' ? COLORS.error : alertType === 'delay' ? COLORS.warning : COLORS.primary}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.text }}>
                    {alertType === "breakdown" ? "Breakdown" : alertType === "delay" ? "Delay" : "Note"}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textLight }}>Send alert to admin</Text>
                </View>
              </View>

              <Pressable onPress={() => setAlertOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={COLORS.textLight} />
              </Pressable>
            </View>

            <TextInput
              placeholder="What's happening? (e.g., Heavy traffic near Kandy, will be 15m late)"
              value={alertText}
              onChangeText={setAlertText}
              multiline
              placeholderTextColor={COLORS.textLight}
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 14,
                borderRadius: 12,
                backgroundColor: COLORS.background,
                color: COLORS.text,
                minHeight: 120,
                textAlignVertical: "top",
                fontSize: 16
              }}
            />

            <Pressable
              onPress={sendAlert}
              disabled={sendingAlert}
              style={{
                backgroundColor: sendingAlert ? COLORS.primaryDark : COLORS.text,
                padding: 16,
                borderRadius: 14,
                alignItems: "center",
                marginTop: 8
              }}
            >
              {sendingAlert ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Send Alert</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
