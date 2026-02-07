// components/Screen.tsx
import React from "react";
import { View, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import theme from "../constants/theme";

export default function Screen({
  children,
  scroll = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const content = (
    <View
      style={{
        flex: 1,
        alignSelf: "center",
        width: "100%",
        maxWidth: 520,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
      }}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={["top", "bottom"]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: Platform.OS === "ios" ? 16 : 20,
          }}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
