import React from "react";
import { View, ViewStyle } from "react-native";
import theme from "../constants/theme";

export default function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 14,
      }, style]}
    >
      {children}
    </View>
  );
}

