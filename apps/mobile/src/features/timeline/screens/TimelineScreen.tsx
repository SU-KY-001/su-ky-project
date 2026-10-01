import { FlatList, StyleSheet, Text, View } from "react-native";
import { ScreenFrame } from "@/shared/components/ScreenFrame";
import { ScreenHeading } from "@/shared/components/ScreenHeading";
import { colors, spacing } from "@/shared/theme";

const timelineSections = [
  {
    id: "timeline-placeholder",
    title: "Dòng thời gian đang được chuẩn bị",
    description: "Các thời kỳ lịch sử sẽ được sắp xếp theo trình tự để bạn dễ khám phá.",
  },
];

export function TimelineScreen() {
  return (
    <ScreenFrame>
      <FlatList
        contentContainerStyle={styles.content}
        data={timelineSections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ScreenHeading
            eyebrow="Theo dấu thời gian"
            title="Dòng thời gian"
            description="Nhìn lại những giai đoạn định hình lịch sử Việt Nam."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
        onEndReachedThreshold={0.5}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.lg },
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
