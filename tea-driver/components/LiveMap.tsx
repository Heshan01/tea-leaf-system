import React, { useEffect, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { COLORS, SIZES } from "../constants/Theme";

type Props = {
  lat?: number | null;
  lng?: number | null;
  title?: string;
  height?: number;
  follow?: boolean; // true නම් marker එකට auto-center
};

export default function LiveMap({
  lat,
  lng,
  title = "Live Location",
  height = 320,
  follow = true,
}: Props) {
  const mapRef = useRef<MapView | null>(null);

  const region: Region | null = useMemo(() => {
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [lat, lng]);

  // ✅ Realtime change වෙද්දි map එක marker එකට center කරගන්න
  useEffect(() => {
    if (!follow) return;
    if (!region) return;
    mapRef.current?.animateToRegion(region, 450);
  }, [region, follow]);

  if (!region) {
    return (
      <View
        style={{
          height,
          borderRadius: SIZES.radius,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.card,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Text style={{ color: COLORS.textLight, fontWeight: "800" }}>
          No live location yet...
        </Text>
        <Text style={{ color: COLORS.textLight, marginTop: 6 }}>
          Sharing start කලාට පස්සේ map එක පෙන්නනවා 🙂
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        height,
        borderRadius: SIZES.radius,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
      }}
    >
      <MapView
        ref={(r) => (mapRef.current = r)}
        style={{ flex: 1 }}
        initialRegion={region}
      // provider={PROVIDER_GOOGLE} // Google tiles force කරන්න ඕන නම් uncomment
      >
        <Marker
          coordinate={{ latitude: region.latitude, longitude: region.longitude }}
          title={title}
          description="Realtime location"
        />
      </MapView>
    </View>
  );
}
