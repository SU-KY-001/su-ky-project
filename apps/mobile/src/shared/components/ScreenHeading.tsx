import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/shared/theme";

interface ScreenHeadingProps {
  eyebrow?: string;
  title: string;
  description: string;
}

export function ScreenHeading({ eyebrow, title, description }: ScreenHeadingProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { color: colors.text, fontSize: 30, fontWeight: "700" },
  description: { color: colors.muted, fontSize: 16, lineHeight: 23 },
});
