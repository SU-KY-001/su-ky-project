import { FlatList, StyleSheet, Text, View } from "react-native";
import { ScreenFrame } from "@/shared/components/ScreenFrame";
import { ScreenHeading } from "@/shared/components/ScreenHeading";
import { colors, spacing } from "@/shared/theme";

const catalogSections = [
  {
    id: "catalog-placeholder",
    title: "Thư viện nội dung",
    description: "Bộ sưu tập tập podcast, nhân vật và chủ đề sẽ được cập nhật tại đây.",
  },
];

export function CatalogScreen() {
  return (
    <ScreenFrame>
      <FlatList
        contentContainerStyle={styles.content}
        data={catalogSections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ScreenHeading
            eyebrow="Nghe và đọc"
            title="Thư viện"
            description="Tìm các câu chuyện theo chủ đề và nhân vật."
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
