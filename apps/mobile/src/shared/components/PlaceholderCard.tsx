import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/shared/theme";

interface PlaceholderCardProps {
  title: string;
  description: string;
}

export function PlaceholderCard({ title, description }: PlaceholderCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: "700" },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
