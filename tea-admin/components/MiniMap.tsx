import React from "react";
import { View, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function MiniMap({
  lat,
  lng,
  title = "Live Location",
  height = 180,
}: {
  lat?: number;
  lng?: number;
  title?: string;
  height?: number;
}) {
  const has = typeof lat === "number" && typeof lng === "number";

  if (!has) {
    return (
      <View
        style={{
          height,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#F8FAFC",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#64748B", fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: "#94A3B8", marginTop: 6 }}>No location yet</Text>
      </View>
    );
  }

  const region = {
    latitude: lat!,
    longitude: lng!,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View
      style={{
        height,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <MapView style={{ flex: 1 }} region={region}>
        <Marker coordinate={{ latitude: lat!, longitude: lng! }} title={title} />
      </MapView>
    </View>
  );
}
