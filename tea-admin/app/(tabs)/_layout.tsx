import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";

function AlertTabIcon({ color, size, showBadge }: { color: string; size: number; showBadge: boolean }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="alert-circle-outline" color={color} size={size} />

      {showBadge && (
        <View
          style={{
            position: "absolute",
            top: -6,
            right: -10,
            minWidth: 18,
            height: 18,
            borderRadius: 999,
            paddingHorizontal: 5,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#DC2626",
            borderWidth: 2,
            borderColor: "white",
          }}
        >
          {/* warning mark */}
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>!</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const showAlertBadge = true; // ✅ later: connect to unread alerts count

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#166534",
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="lorries"
        options={{
          title: "Lorry",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bus-outline" color={color} size={size} />
          ),
        }}
      />

      {/* ✅ Alerts tab visible + warning badge */}
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <AlertTabIcon color={color} size={size} showBadge={showAlertBadge} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />

      {/* ✅ Hidden routes */}
      <Tabs.Screen name="lorry/[id]" options={{ href: null }} />

      {/* ❌ Remove this to avoid duplicate name issues */}
      {/* <Tabs.Screen name="index" options={{ href: null }} /> */}
    </Tabs>
  );
}
