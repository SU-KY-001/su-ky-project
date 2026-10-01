import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { ScreenFrame } from "@/shared/components/ScreenFrame";
import { ScreenHeading } from "@/shared/components/ScreenHeading";
import { colors, spacing } from "@/shared/theme";

export function EpisodeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <ScreenFrame>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeading
          eyebrow="Chi tiết tập"
          title="Nội dung tập podcast"
          description="Thông tin tập, bản chép lời và trích dẫn sẽ được trình bày tại đây."
        />
        <Text style={styles.slug}>Mã nội dung: {slug}</Text>
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.lg },
  slug: { color: colors.muted, fontSize: 14 },
});
