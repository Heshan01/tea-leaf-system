import React from "react";
import { View, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";

type Props = {
  lat?: number;
  lng?: number;
  title?: string;
};

export default function MiniMap({ lat, lng, title }: Props) {
  if (lat == null || lng == null) {
    return (
      <View
        style={{
          height: 220,
          borderRadius: 12,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#6B7280" }}>Map loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ height: 220, borderRadius: 12, overflow: "hidden", borderWidth: 1 }}>
      <MapView
        style={{ flex: 1 }}
        region={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} title={title ?? "Driver"} />
      </MapView>
    </View>
  );
}
