import React, { useMemo } from "react";
import { View, Text, Pressable, Alert, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

const THEME = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E5E7EB",
  green: "#166534",
  green2: "#22C55E",
  red: "#DC2626",
  chip: "#F8FAFC",
};

export default function Settings() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;
  const P = useMemo(() => (isTablet ? 22 : isSmall ? 12 : 16), [isTablet, isSmall]);

  const Row = ({
    icon,
    title,
    desc,
    onPress,
  }: {
    icon: any;
    title: string;
    desc: string;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: THEME.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: THEME.border,
        padding: 14,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: THEME.chip,
          borderWidth: 1,
          borderColor: THEME.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={THEME.green} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "900", color: THEME.text }}>{title}</Text>
        <Text style={{ color: THEME.muted, marginTop: 2 }}>{desc}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={THEME.muted} />
    </Pressable>
  );

  const doLogout = async () => {
    Alert.alert("Logout", "ඔබට logout වෙන්න ඕනද?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <View style={{ padding: P, gap: 12 }}>
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
          <Text style={{ fontSize: isTablet ? 24 : 20, fontWeight: "900", color: THEME.text }}>
            Settings
          </Text>
          <Text style={{ color: THEME.muted }}>Driver app preferences & account</Text>
        </View>

        <Row
          icon="notifications-outline"
          title="Notifications"
          desc="Message alerts / sound (future option)"
          onPress={() => Alert.alert("Coming soon", "Next update එකෙන් add කරනවා ✅")}
        />

        <Row
          icon="shield-checkmark-outline"
          title="Privacy & Security"
          desc="Account security tips"
          onPress={() => Alert.alert("Tip", "Password share කරන්න එපා. Unknown links open කරන්න එපා.")}
        />

        <Row
          icon="help-circle-outline"
          title="Help & Support"
          desc="Contact admin / FAQ"
          onPress={() => Alert.alert("Support", "Admin team එකට message කරන්න (future).")}
        />

        <Pressable
          onPress={doLogout}
          style={{
            backgroundColor: THEME.red,
            borderRadius: 16,
            padding: 14,
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>Logout</Text>
        </Pressable>

        <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center" }}>
          Version: Driver App 2026 • Tea Leaf Green Theme
        </Text>
      </View>
    </SafeAreaView>
  );
}
