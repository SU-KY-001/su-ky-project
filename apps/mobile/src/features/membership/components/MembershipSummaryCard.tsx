import { Button, Text, XStack, YStack } from "tamagui";
import { AppCard, AppIcon } from "@/shared/ui";
import { formatDate, useMockMembership } from "../mock";

export function MembershipSummaryCard({ onPress }: { onPress: () => void }): React.JSX.Element {
  const store = useMockMembership();
  const entitlement = store.entitlement();
  const premium = entitlement.tier === "premium";

  return (
    <Button unstyled w="100%" onPress={onPress} accessibilityRole="button" accessibilityLabel={premium ? "Quản lý gói Premium" : "Nâng cấp gói Premium"} pressStyle={{ op: 0.85 }}>
      <AppCard dark>
        <XStack p="$3.5" items="center" g="$3">
          <YStack w="$4.5" h="$4.5" rounded="$10" items="center" justify="center" bg="$nightSoft" bw="$0.25" bc="$bronze">
            <AppIcon name="award" size={20} color="#B58A3C" />
          </YStack>
          <YStack f={1} g="$1" minW={0}>
            <XStack items="center" g="$2">
              <Text ff="$heading" fs="$3" lh="$3" fw="$7" color="$paperSoft">{premium ? "Sử Ký Premium" : "Gói Miễn phí"}</Text>
              {entitlement.renewSoon ? (
                <XStack px="$1.5" py="$0.5" rounded="$8" bw="$0.25" bc="$bronze">
                  <Text ff="$body" fs="$1" fw="$6" color="$bronze">Sắp hết hạn</Text>
                </XStack>
              ) : null}
            </XStack>
            <Text ff="$body" fs="$1" lh="$2" color="$paperDeep" numberOfLines={2}>
              {premium
                ? `Còn ${entitlement.daysLeft} ngày · hết hạn ${formatDate(entitlement.expiresAt)}`
                : "Nâng cấp để nghe toàn bộ audio và mở khoá kịch bản."}
            </Text>
          </YStack>
          <AppIcon name="chevron-right" size={18} color="#B58A3C" />
        </XStack>
      </AppCard>
    </Button>
  );
}
