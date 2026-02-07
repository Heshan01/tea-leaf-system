import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../../lib/firebase";

export default function HomeScreen() {
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [activeLorries, setActiveLorries] = useState(0);

  useEffect(() => {
    // presence count
    const pRef = ref(rtdb, "presence");
    const unsub1 = onValue(pRef, (snap) => {
      const data = snap.val() || {};
      const count = Object.values<any>(data).filter((x) => x?.online === true).length;
      setOnlineUsers(count);
    });

    // live lorries count
    const liveRef = ref(rtdb, "live");
    const unsub2 = onValue(liveRef, (snap) => {
      const data = snap.val() || {};
      setActiveLorries(Object.keys(data).length);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Dashboard</Text>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Quick Stats</Text>
        <Text>Online Users: {onlineUsers}</Text>
        <Text>Live Lorries: {activeLorries}</Text>
      </View>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Next</Text>
        <Text style={{ color: "#6B7280" }}>
          Lorries tab එකට ගිහින් vehicles manage කරලා live map බලන්න.
        </Text>
      </View>
    </View>
  );
}
