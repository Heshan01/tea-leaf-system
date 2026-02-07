import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

type AlertType = "breakdown" | "delay" | "note" | "emergency";

const THEME = {
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E5E7EB",
  green: "#166534",
  green2: "#22C55E",
  greenSoft: "#DCFCE7",
  dark: "#111827",
};

export default function QuickAlertToAdmin({
  padding = 16,
  uid,
  vehicleId,
  routeId,
}: {
  padding?: number;
  uid: string;
  vehicleId: string;
  routeId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AlertType>("breakdown");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const title = useMemo(() => {
    if (type === "breakdown") return "🧰 Breakdown";
    if (type === "delay") return "⏳ Delay";
    if (type === "emergency") return "🚨 Emergency";
    return "📝 Note";
  }, [type]);

  const openSheet = (t: AlertType) => {
    setType(t);
    setMessage("");
    setOpen(true);
  };

  const send = async () => {
    const msg = message.trim();
    if (!msg) {
      Alert.alert("Message", "පණිවිඩය ටිකක් ලියන්න");
      return;
    }
    if (!uid) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    try {
      setSending(true);

      await addDoc(collection(db, "alerts"), {
        type,
        message: msg,
        createdAtMs: Date.now(),
        createdAt: serverTimestamp(),
        status: "new",
        driverUid: uid,
        vehicleId: vehicleId || null,
        routeId: routeId || null,
      });

      setOpen(false);
      setMessage("");

      // ✅ no popup needed (you said). just silent success.
      // If you want a subtle UI toast later, we can do it.
    } catch (e: any) {
      Alert.alert("Send Failed", e?.message ?? "Unknown error");
    } finally {
      setSending(false);
    }
  };

  const CardButton = ({
    label,
    desc,
    bg,
    border,
    text,
    onPress,
  }: {
    label: string;
    desc: string;
    bg: string;
    border: string;
    text: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        flexGrow: 1,
        minWidth: 140,
        backgroundColor: bg,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <Text style={{ fontWeight: "900", color: text }}>{label}</Text>
      <Text style={{ color: text, marginTop: 4 }}>{desc}</Text>
    </Pressable>
  );

  return (
    <>
      {/* Section */}
      <View
        style={{
          backgroundColor: THEME.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: THEME.border,
          padding,
          gap: 10,
        }}
      >
        <Text style={{ fontWeight: "900", color: THEME.text }}>Quick Alerts to Admin</Text>
        <Text style={{ color: THEME.muted }}>
          Breakdown / Delay වගේ හදිසි අවස්ථාවල Adminට ඉක්මනට යවන්න.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <CardButton
            label="🧰 Breakdown"
            desc="Engine / tyre issue"
            bg="#FEE2E2"
            border="#FCA5A5"
            text="#991B1B"
            onPress={() => openSheet("breakdown")}
          />

          <CardButton
            label="⏳ Delay"
            desc="Traffic / late"
            bg="#FEF9C3"
            border="#FDE68A"
            text="#92400E"
            onPress={() => openSheet("delay")}
          />

          <CardButton
            label="🚨 Emergency"
            desc="Urgent help"
            bg="#FFE4E6"
            border="#FDA4AF"
            text="#9F1239"
            onPress={() => openSheet("emergency")}
          />

          <CardButton
            label="📝 Note"
            desc="Message to admin"
            bg={THEME.greenSoft}
            border="#86EFAC"
            text={THEME.green}
            onPress={() => openSheet("note")}
          />
        </View>
      </View>

      {/* Bottom sheet */}
      <Modal visible={open} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}>
          <View
            style={{
              marginTop: "auto",
              backgroundColor: "white",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: THEME.text }}>{title}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={{ fontWeight: "900", color: THEME.green }}>Close</Text>
              </Pressable>
            </View>

            <Text style={{ color: THEME.muted }}>
              Adminට Firestore → <Text style={{ fontWeight: "900" }}>alerts</Text> collection එකට යනවා.
            </Text>

            <View
              style={{
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 14,
                padding: 12,
                gap: 6,
              }}
            >
              <Text style={{ color: THEME.muted }}>
                Vehicle: <Text style={{ color: THEME.text, fontWeight: "900" }}>{vehicleId}</Text>
              </Text>
              <Text style={{ color: THEME.muted }}>
                Route: <Text style={{ color: THEME.text, fontWeight: "900" }}>{routeId ?? "-"}</Text>
              </Text>
            </View>

            <TextInput
              placeholder="Write message... (ex: Tyre puncture near town. Stopping now.)"
              value={message}
              onChangeText={setMessage}
              multiline
              placeholderTextColor="#94A3B8"
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
              onPress={send}
              disabled={sending}
              style={{
                backgroundColor: sending ? "#94A3B8" : THEME.dark,
                paddingVertical: Platform.OS === "ios" ? 14 : 12,
                borderRadius: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {sending ? <ActivityIndicator color="white" /> : <Ionicons name="send" size={18} color="white" />}
              <Text style={{ color: "white", fontWeight: "900" }}>
                {sending ? "Sending..." : "Send to Admin"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
