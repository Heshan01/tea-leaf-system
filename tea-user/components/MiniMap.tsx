// components/MiniMap.tsx
import React from "react";
import { View, Text } from "react-native";
import { WebView } from "react-native-webview";
import theme from "../constants/theme";

export default function MiniMap({
  lat,
  lng,
  title,
}: {
  lat: number;
  lng: number;
  title?: string;
}) {
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        html, body { margin:0; padding:0; height:100%; background:#fff; }
        iframe { border:0; width:100%; height:100%; }
      </style>
    </head>
    <body>
      <iframe
        src="https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
      ></iframe>
    </body>
  </html>`;

  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: "hidden",
      }}
    >
      {!!title && (
        <Text
          style={{
            padding: 10,
            fontWeight: "800",
            color: theme.colors.primary,
          }}
        >
          {title}
        </Text>
      )}

      <View style={{ height: 220 }}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </View>
  );
}
