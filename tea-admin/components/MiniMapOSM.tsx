// components/MiniMapOSM.tsx
import React, { useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";

type Props = {
  lat?: number | null;
  lng?: number | null;
  height?: number;
  zoom?: number;
};

export default function MiniMapOSM({ lat, lng, height = 140, zoom = 15 }: Props) {
  const hasCoords = typeof lat === "number" && typeof lng === "number";

  const html = useMemo(
    () => `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map { height:100%; margin:0; padding:0; }
    .leaflet-control-container { display:none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map("map", {
      zoomControl:false,
      attributionControl:false,
      dragging:false,
      scrollWheelZoom:false,
      doubleClickZoom:false,
      boxZoom:false,
      keyboard:false,
      tap:false
    });
    map.setView([${lat}, ${lng}], ${zoom});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    L.marker([${lat}, ${lng}]).addTo(map);
  </script>
</body>
</html>`,
    [lat, lng, zoom]
  );

  if (!hasCoords) {
    return (
      <View style={[styles.wrap, { height }, styles.empty]}>
        <Text style={styles.emptyText}>No live location yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  web: { flex: 1, backgroundColor: "transparent" },
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#64748B", fontWeight: "700" },
});
