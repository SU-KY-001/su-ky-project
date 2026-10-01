import { ScrollView, StyleSheet, Text } from "react-native";
import { PlaceholderCard } from "@/shared/components/PlaceholderCard";
import { ScreenFrame } from "@/shared/components/ScreenFrame";
import { ScreenHeading } from "@/shared/components/ScreenHeading";
import { colors, spacing } from "@/shared/theme";

export function HomeScreen() {
  return (
    <ScreenFrame>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>SỬ KÝ</Text>
        <ScreenHeading
          eyebrow="Lịch sử Việt Nam"
          title="Mỗi câu chuyện mở ra một thời đại."
          description="Khám phá các triều đại, nhân vật và dấu mốc qua những câu chuyện lịch sử."
        />
        <PlaceholderCard
          title="Khám phá tập đầu tiên"
          description="Các tập podcast và nội dung nổi bật sẽ xuất hiện tại đây."
        />
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.xl, padding: spacing.lg },
  brand: { color: colors.accent, fontSize: 13, fontWeight: "800", letterSpacing: 2 },
});
