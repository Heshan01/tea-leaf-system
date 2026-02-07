// components/PrimaryButton.tsx
import React from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import theme from "../constants/theme";

export default function PrimaryButton({
  title,
  onPress,
  variant = "dark",
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "dark" | "accent";
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = variant === "accent" ? theme.colors.accent : theme.colors.primary;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingVertical: 16,
          paddingHorizontal: 20,
          borderRadius: theme.radius.md,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
          shadowColor: bg,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        style,
      ]}
    >
      <Text style={{
        color: "white",
        textAlign: "center",
        fontWeight: "900",
        fontSize: 16,
        letterSpacing: 0.5
      }}>
        {title}
      </Text>
    </Pressable>
  );
}

