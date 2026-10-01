import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/shared/theme";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Không tìm thấy trang</Text>
      <Link href="/" style={styles.link}>
        Về trang chủ
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  link: { color: colors.accent, fontSize: 16 },
});
