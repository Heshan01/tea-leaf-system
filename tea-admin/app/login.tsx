import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { auth, db } from "../lib/firebase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = res.user.uid;

      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) {
        Alert.alert("Error", "Firestore users collection එකේ role doc එක නැහැ.");
        return;
      }

      const role = (snap.data().role || "").toLowerCase();

      if (role === "admin") {
        router.replace("/(tabs)/home"); // your admin home route
      } else {
        Alert.alert("Access Denied", "Only Admin role allowed.");
      }
    } catch (e: any) {
      Alert.alert("Login Failed", e?.message ?? "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoIcon}>🍃</Text>
        </View>
        <Text style={styles.title}>Tea Leaf System</Text>
        <Text style={styles.subtitle}>Admin Portal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Welcome Back</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            placeholder="admin@tealeaf.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        <Pressable onPress={login} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>
      </View>

      <Text style={styles.footerText}>© 2026 Tea Leaf System</Text>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#10B981", // Vibrant Tea Leaf Green
    justifyContent: "center" as "center",
    padding: 24,
  },
  headerContainer: {
    alignItems: "center" as "center",
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 40,
    justifyContent: "center" as "center",
    alignItems: "center" as "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800" as "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: "#D1FAE5", // Light green text
    marginTop: 8,
    fontWeight: "500" as "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  cardHeader: {
    fontSize: 24,
    fontWeight: "700" as "700",
    color: "#065F46", // Darker green for text
    marginBottom: 24,
    textAlign: "center" as "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as "600",
    color: "#374151",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    fontSize: 16,
    color: "#1F2937",
  },
  button: {
    backgroundColor: "#059669", // Rich green button
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: "#059669",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "white",
    textAlign: "center" as "center",
    fontWeight: "700" as "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  footerText: {
    marginTop: 32,
    textAlign: "center" as "center",
    color: "#D1FAE5",
    fontSize: 12,
  },
};
