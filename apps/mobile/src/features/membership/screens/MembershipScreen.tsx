import { ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ExperienceFeature } from "@repo/shared";
import { AppCard, AppHeader, AppIcon, PrimaryButton, ProgressBar, SectionHeader, type IconName } from "@/shared/ui";
import { FEATURE_ICONS, FEATURE_LABELS, ORDER_STATUS_LABELS, formatDate, formatVnd } from "../format";
import { useCreateOrder, useMembership, useMembershipOrders, useMembershipPlans } from "../hooks/useMembership";
import type { MembershipEntitlement, MembershipOrder, MembershipPlan } from "../services/membershipService";

const ORDER_TONE = {
  pending: "#B58A3C",
  needs_review: "#B58A3C",
  paid: "#55714A",
  rejected: "#B8322A",
} as const satisfies Record<MembershipOrder["status"], string>;

function OrderStatusTag({ status }: { status: MembershipOrder["status"] }): React.JSX.Element {
  const color = ORDER_TONE[status];
  return (
    <XStack px="$2" py="$0.5" rounded="$8" bw="$0.25" bc={color} bg="$paperSoft">
      <Text ff="$body" fs="$1" fw="$6" color={color}>{ORDER_STATUS_LABELS[status]}</Text>
    </XStack>
  );
}

function StatusCard({ entitlement }: { entitlement: MembershipEntitlement }): React.JSX.Element {
  const premium = entitlement.tier === "premium";
  const podcastQuota = entitlement.experienceQuotas.find((item) => item.feature === "podcast");
  const freeSummary = podcastQuota?.mode === "free_limited" && podcastQuota.limit !== null
    ? `${FEATURE_LABELS.podcast} ${podcastQuota.limit} lượt/ngày. Nâng cấp để mở khoá toàn bộ audio và kịch bản.`
    : podcastQuota?.mode === "premium_only"
      ? "Podcast đang dành riêng cho Premium. Nâng cấp để mở khoá toàn bộ audio và kịch bản."
      : "Nâng cấp để mở khoá toàn bộ audio và kịch bản Premium.";
  return (
    <AppCard selected>
      <YStack p="$4" g="$2.5">
        <XStack items="center" justify="space-between">
          <XStack items="center" g="$2">
            <AppIcon name="award" size={18} color="#B58A3C" />
            <Text ff="$body" fs="$1" fw="$7" ls={1.5} color="$bronzeDark">SỬ KÝ PREMIUM</Text>
          </XStack>
          {entitlement.renewSoon ? (
            <XStack px="$2" py="$0.5" rounded="$8" bc="$bronze" bw="$0.25">
              <Text ff="$body" fs="$1" fw="$6" color="$bronzeDark">Sắp hết hạn</Text>
            </XStack>
          ) : null}
        </XStack>
        <Text ff="$heading" fs="$5" lh="$5" fw="$7" color="$ink">
          {premium ? "Thành viên Premium" : "Gói Miễn phí"}
        </Text>
        {premium ? (
          <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">
            Hết hạn {formatDate(entitlement.expiresAt)} · còn {entitlement.daysLeft} ngày
          </Text>
        ) : (
          <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">{freeSummary}</Text>
        )}
        {entitlement.renewSoon ? (
          <Text ff="$body" fs="$2" lh="$3" color="$bronzeDark">
            Gia hạn trước khi hết hạn để không gián đoạn audio và kịch bản.
          </Text>
        ) : null}
      </YStack>
    </AppCard>
  );
}

function QuotaSection({ entitlement }: { entitlement: MembershipEntitlement }): React.JSX.Element | null {
  if (entitlement.tier === "premium") {
    return (
      <AppCard>
        <YStack p="$4" g="$1.5">
          <Text ff="$heading" fs="$3" fw="$6" color="$ink">Không giới hạn</Text>
          <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Premium không bị giới hạn lượt nghe, lượt quiz và lượt vào triển lãm.</Text>
        </YStack>
      </AppCard>
    );
  }

  const limited = entitlement.experienceQuotas.filter((item) => item.mode === "free_limited" && item.limit !== null);
  const premiumOnly = entitlement.experienceQuotas.filter((item) => item.mode === "premium_only");
  if (limited.length === 0 && premiumOnly.length === 0) return null;

  return (
    <YStack g="$2.5">
      <SectionHeader title="Lượt dùng hôm nay" />
      <AppCard>
        <YStack p="$4" g="$3.5">
          {limited.map((quota) => {
            const limit = quota.limit ?? 0;
            const remaining = quota.remaining ?? Math.max(0, limit - quota.usedToday);
            return (
              <YStack key={quota.feature} g="$1.5">
                <XStack items="center" justify="space-between" g="$2">
                  <XStack items="center" g="$2" f={1}>
                    <AppIcon name={FEATURE_ICONS[quota.feature as ExperienceFeature] as IconName} size={16} color="#5B4E44" />
                    <Text ff="$body" fs="$2" fw="$5" color="$ink">{FEATURE_LABELS[quota.feature as ExperienceFeature]}</Text>
                  </XStack>
                  <Text ff="$body" fs="$2" fw="$7" color={remaining === 0 ? "$vermilion" : "$ink"}>
                    {quota.usedToday}/{limit}
                  </Text>
                </XStack>
                <ProgressBar value={limit > 0 ? (quota.usedToday / limit) * 100 : 0} />
                <Text ff="$body" fs="$1" color="$inkSoft">
                  {remaining === 0 ? "Đã hết lượt hôm nay · mở lại lúc 00:00 (giờ Việt Nam)" : `Còn ${remaining} lượt · đặt lại lúc 00:00 (giờ Việt Nam)`}
                </Text>
              </YStack>
            );
          })}
          {premiumOnly.map((quota) => (
            <YStack key={quota.feature} g="$1.5">
              <XStack items="center" justify="space-between" g="$2">
                <XStack items="center" g="$2" f={1}>
                  <AppIcon name={FEATURE_ICONS[quota.feature as ExperienceFeature] as IconName} size={16} color="#5B4E44" />
                  <Text ff="$body" fs="$2" fw="$5" color="$ink">{FEATURE_LABELS[quota.feature as ExperienceFeature]}</Text>
                </XStack>
                <Text ff="$body" fs="$2" fw="$7" color="$bronzeDark">Chỉ Premium</Text>
              </XStack>
              <Text ff="$body" fs="$1" color="$inkSoft">Nâng cấp Premium để sử dụng tính năng này.</Text>
            </YStack>
          ))}
        </YStack>
      </AppCard>
    </YStack>
  );
}

const BENEFITS = [
  "Nghe toàn bộ audio Premium, không giới hạn lượt",
  "Mở khoá toàn bộ kịch bản của tập Premium",
  "Không giới hạn lượt quiz và lượt vào triển lãm",
  "Hiển thị nhãn Premium trong hồ sơ",
];

function PlanSection({ plan, premium, pending, error, onCreate }: { plan: MembershipPlan; premium: boolean; pending: boolean; error: string | null; onCreate: () => void }): React.JSX.Element {
  return (
    <YStack g="$2.5">
      <SectionHeader title="Gói thành viên" />
      <AppCard selected>
        <YStack p="$4" g="$3">
          <XStack items="flex-end" justify="space-between">
            <YStack g="$0.5">
              <Text ff="$heading" fs="$4" fw="$7" color="$ink">{plan.name}</Text>
              <Text ff="$body" fs="$1" color="$inkSoft">{plan.durationDays} ngày · gia hạn thủ công</Text>
            </YStack>
            <YStack items="flex-end" g="$0.5">
              <Text ff="$heading" fs="$5" fw="$7" color="$vermilion">{formatVnd(plan.priceVnd)}</Text>
              <Text ff="$body" fs="$1" color="$inkSoft">mỗi tháng</Text>
            </YStack>
          </XStack>
          <YStack g="$2">
            {BENEFITS.map((benefit) => (
              <XStack key={benefit} items="flex-start" g="$2">
                <AppIcon name="check" size={15} color="#B58A3C" />
                <Text ff="$body" fs="$2" lh="$3" color="$ink" f={1}>{benefit}</Text>
              </XStack>
            ))}
          </YStack>
          <PrimaryButton label={pending ? "Đang tạo đơn…" : premium ? "Gia hạn thêm 30 ngày" : "Mua gói tháng"} onPress={onCreate} disabled={pending} />
          {error ? <Text ff="$body" fs="$1" lh="$2" color="$vermilion" text="center">{error}</Text> : null}
          <Text ff="$body" fs="$1" lh="$2" color="$inkSoft" text="center">
            Thanh toán chuyển khoản. Đơn được quản trị viên duyệt thủ công.
          </Text>
        </YStack>
      </AppCard>
    </YStack>
  );
}

function OrdersSection({ orders, onOpen }: { orders: MembershipOrder[]; onOpen: (orderId: string) => void }): React.JSX.Element {
  const visible = orders.slice(0, 4);
  return (
    <YStack g="$2.5">
      <SectionHeader title="Lịch sử đơn" />
      {visible.length === 0 ? (
        <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Bạn chưa có đơn nào.</Text>
      ) : (
        <YStack g="$2">
          {visible.map((order) => {
            const openable = order.status === "pending" || order.status === "needs_review";
            return (
              <AppCard key={order.id} onPress={openable ? () => onOpen(order.id) : undefined}>
                <XStack p="$3" items="center" g="$2">
                  <YStack f={1} g="$1" minW={0}>
                    <XStack items="center" g="$2">
                      <Text ff="$body" fs="$2" fw="$6" color="$ink">{order.transferContent}</Text>
                      <OrderStatusTag status={order.status} />
                    </XStack>
                    <Text ff="$body" fs="$1" color="$inkSoft">
                      {formatVnd(order.priceVnd)} · {formatDate(order.createdAt)}
                    </Text>
                  </YStack>
                  {openable ? <AppIcon name="chevron-right" size={18} color="#5B4E44" /> : null}
                </XStack>
              </AppCard>
            );
          })}
        </YStack>
      )}
    </YStack>
  );
}

export function MembershipScreen({ onBack, onOpenOrder }: { onBack: () => void; onOpenOrder: (orderId: string) => void }): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const status = useMembership();
  const plans = useMembershipPlans();
  const orders = useMembershipOrders();
  const create = useCreateOrder(onOpenOrder);
  const plan = plans.data?.find((item) => item.isPurchasable);

  return (
    <YStack f={1} bg="$paper" pt={insets.top}>
      <AppHeader title="Gói Premium" onBack={onBack} />
      <ScrollView f={1} bg="$paper" showsVerticalScrollIndicator={false}>
        <YStack px="$4" pt="$3" pb={insets.bottom + 24} g="$5">
          {status.isPending ? (
            <YStack items="center" py="$8"><Spinner color="$vermilion" accessibilityLabel="Đang tải gói Premium" /></YStack>
          ) : status.isError || !status.data ? (
            <YStack items="center" g="$3" py="$8">
              <Text ff="$body" fs="$2" lh="$3" color="$inkSoft" text="center">Chưa tải được thông tin thành viên. Kiểm tra kết nối và thử lại.</Text>
              <PrimaryButton secondary label="Thử lại" onPress={() => { void status.refetch(); }} />
            </YStack>
          ) : (
            <>
              <StatusCard entitlement={status.data} />
              <QuotaSection entitlement={status.data} />
              {plan ? (
                <PlanSection
                  plan={plan}
                  premium={status.data.tier === "premium"}
                  pending={create.isPending}
                  error={create.isError ? "Chưa tạo được đơn. Vui lòng thử lại." : null}
                  onCreate={() => create.mutate(plan.code)}
                />
              ) : null}
              <OrdersSection orders={orders.data?.items ?? []} onOpen={onOpenOrder} />
            </>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
