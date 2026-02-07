import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

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
};

type UserDoc = {
  role?: string;
  email?: string;
  name?: string;
  createdAt?: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // responsive sizing
  const isSmall = width < 360;
  const isTablet = width >= 768;

  const P = isTablet ? 22 : isSmall ? 12 : 16;
  const RADIUS = isTablet ? 22 : 18;
  const CARD_PAD = isTablet ? 18 : isSmall ? 12 : 14;

  const user = auth.currentUser;
  const uid = user?.uid ?? null;

  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) setProfile(snap.data() as any);
        else setProfile(null);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Profile load error");
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const displayName = useMemo(() => {
    // priority: Firestore name -> Firebase displayName -> email -> "Admin"
    return (
      profile?.name ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "Admin"
    );
  }, [profile, user]);

  const displayEmail = profile?.email || user?.email || "-";
  const role = profile?.role || "admin";

  const openComingSoon = (title: string) =>
    Alert.alert(title, "මෙක ඉදිරියේදි add කරනවා ✅");

  const doLogout = async () => {
    Alert.alert("Logout", "Logout වෙන්නද?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            // go to root, your index.tsx will show login again
            router.replace("/login");
          } catch (e: any) {
            Alert.alert("Logout Failed", e?.message ?? "Unknown error");
          }
        },
      },
    ]);
  };

  const Row = ({
    icon,
    title,
    subtitle,
    onPress,
    danger,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: CARD_PAD,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 16,
        backgroundColor: "#F8FAFC",
      }}
    >
      <View
        style={{
          width: isTablet ? 44 : 40,
          height: isTablet ? 44 : 40,
          borderRadius: 999,
          backgroundColor: danger ? "#FEE2E2" : THEME.greenSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? THEME.red : THEME.green}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontWeight: "900",
            color: danger ? THEME.red : THEME.text,
            fontSize: isTablet ? 16 : 14,
          }}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: THEME.muted, marginTop: 3 }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={danger ? THEME.red : THEME.muted}
      />
    </Pressable>
  );

  if (!uid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: P }}>
          <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16 }}>
            Not logged in
          </Text>
          <Text style={{ color: THEME.muted, marginTop: 8, textAlign: "center" }}>
            Please login first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: P, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: CARD_PAD,
          }}
        >
          {loading ? (
            <View style={{ paddingVertical: 12, alignItems: "center", gap: 10 }}>
              <ActivityIndicator />
              <Text style={{ color: THEME.muted }}>Loading profile...</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: isTablet ? 62 : 54,
                  height: isTablet ? 62 : 54,
                  borderRadius: 999,
                  backgroundColor: THEME.greenSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person" size={26} color={THEME.green} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: "900",
                    color: THEME.text,
                    fontSize: isTablet ? 20 : 18,
                  }}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>

                <Text style={{ color: THEME.muted, marginTop: 4 }} numberOfLines={1}>
                  {displayEmail}
                </Text>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: "#86EFAC",
                    }}
                  >
                    <Text style={{ color: THEME.green, fontWeight: "900" }}>
                      ROLE: {role.toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: "#EEF2FF",
                      borderWidth: 1,
                      borderColor: "#C7D2FE",
                    }}
                  >
                    <Text style={{ color: "#3730A3", fontWeight: "900" }}>
                      UID: {uid.slice(0, 6)}...
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Quick buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <Pressable
            onPress={() => router.push("/(tabs)/lorries")}
            style={{
              flex: 1,
              backgroundColor: THEME.green2,
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>Manage Lorries</Text>
          </Pressable>

          <Pressable
            onPress={() => openComingSoon("Edit Profile")}
            style={{
              width: 56,
              backgroundColor: "#111827",
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="create-outline" size={20} color="white" />
          </Pressable>
        </View>

        {/* Settings Section */}
        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: CARD_PAD,
            marginTop: 12,
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16 }}>
            Settings
          </Text>

          <Row
            icon="notifications-outline"
            title="Notifications"
            subtitle="Enable alerts (coming soon)"
            onPress={() => openComingSoon("Notifications")}
          />

          <Row
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            subtitle="Rules / access (coming soon)"
            onPress={() => openComingSoon("Privacy & Security")}
          />

          <Row
            icon="information-circle-outline"
            title="About"
            subtitle="Tea Leaf System info"
            onPress={() => openComingSoon("About")}
          />

          <Row
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="FAQ / contact (coming soon)"
            onPress={() => openComingSoon("Help & Support")}
          />
        </View>

        {/* App info */}
        <View
          style={{
            backgroundColor: THEME.card,
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: CARD_PAD,
            marginTop: 12,
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16 }}>
            App Info
          </Text>

          <View
            style={{
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 16,
              backgroundColor: "#F8FAFC",
              padding: CARD_PAD,
              gap: 6,
            }}
          >
            <Text style={{ color: THEME.muted }}>Version</Text>
            <Text style={{ fontWeight: "900", color: THEME.text }}>
              1.0.0 (Prototype)
            </Text>
            <Text style={{ color: THEME.muted, fontSize: 12 }}>
              iOS + Android responsive UI ✅
            </Text>
          </View>
        </View>

        {/* Logout */}
        <View style={{ marginTop: 14 }}>
          <Row
            icon="log-out-outline"
            title="Logout"
            subtitle="Sign out from admin account"
            onPress={doLogout}
            danger
          />

          <Text
            style={{
              color: "#94A3B8",
              fontSize: 12,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            Tip: Production වල Admin create-driver accounts secure කරන්නේ Cloud Functions + Admin SDK වලින්.
          </Text>
        </View>

        <View style={{ height: Platform.OS === "ios" ? 8 : 14 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
