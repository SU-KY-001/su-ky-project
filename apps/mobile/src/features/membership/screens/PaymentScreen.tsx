import { useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { Button, ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppCard, AppHeader, AppIcon, PrimaryButton, SectionHeader, type IconName } from "@/shared/ui";
import { ORDER_STATUS_LABELS, formatDate, formatVnd } from "../format";
import { membershipKeys, useOrderPolling } from "../hooks/useMembership";
import type { MembershipOrder } from "../services/membershipService";

const COPY_FEEDBACK_MS = 1_800;

const REVIEW_REASON_LABELS: Record<string, string> = {
  STACK_LIMIT_REACHED: "Đã vượt trần thời hạn cộng dồn tối đa.",
};

interface CopyRowProps {
  label: string;
  value: string;
  display?: string;
  copied: boolean;
  onCopy: () => void;
}

function CopyRow({ label, value, display, copied, onCopy }: CopyRowProps): React.JSX.Element {
  return (
    <XStack items="center" justify="space-between" g="$2" py="$2.5">
      <YStack g="$0.5" f={1} minW={0}>
        <Text ff="$body" fs="$1" color="$inkSoft">{label}</Text>
        <Text ff="$body" fs="$3" lh="$3" fw="$6" color="$ink" numberOfLines={1}>{display ?? value}</Text>
      </YStack>
      <Button
        unstyled
        fd="row"
        items="center"
        g="$1"
        px="$2"
        py="$1"
        rounded="$8"
        bw="$0.25"
        bc={copied ? "$bronze" : "$line"}
        bg="$paperSoft"
        onPress={onCopy}
        accessibilityRole="button"
        accessibilityLabel={`Sao chép ${label}`}
        pressStyle={{ op: 0.7 }}
      >
        <AppIcon name={copied ? "check" : "copy"} size={14} color={copied ? "#B58A3C" : "#5B4E44"} />
        <Text ff="$body" fs="$1" fw="$6" color={copied ? "$bronzeDark" : "$inkSoft"}>{copied ? "Đã chép" : "Sao chép"}</Text>
      </Button>
    </XStack>
  );
}

function Notice({ icon, title, body, tone }: { icon: IconName; title: string; body: string; tone: "bronze" | "green" | "vermilion" }): React.JSX.Element {
  const color = tone === "green" ? "#55714A" : tone === "vermilion" ? "#B8322A" : "#B58A3C";
  return (
    <AppCard>
      <XStack p="$4" g="$3" items="flex-start">
        <YStack w="$4" h="$4" rounded="$10" items="center" justify="center" bg="$paperDeep">
          <AppIcon name={icon} size={20} color={color} />
        </YStack>
        <YStack f={1} g="$1">
          <Text ff="$heading" fs="$3" lh="$3" fw="$7" color="$ink">{title}</Text>
          <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">{body}</Text>
        </YStack>
      </XStack>
    </AppCard>
  );
}

function TransferView({ order }: { order: MembershipOrder }): React.JSX.Element {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => { clearTimeout(timer.current); }, []);

  const copy = (key: string, value: string): void => {
    void Clipboard.setStringAsync(value);
    setCopiedKey(key);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiedKey(null), COPY_FEEDBACK_MS) as unknown as number;
  };

  return (
    <YStack g="$4">
      <YStack items="center" g="$1" py="$2">
        <Text ff="$body" fs="$1" fw="$7" ls="$1" color="$inkSoft">SỐ TIỀN CẦN CHUYỂN</Text>
        <Text ff="$heading" fs="$7" lh="$7" fw="$7" color="$vermilion">{formatVnd(order.bank.amount)}</Text>
        <Text ff="$body" fs="$2" color="$inkSoft">Mã đơn {order.transferContent}</Text>
      </YStack>

      <Notice
        icon="info"
        tone="bronze"
        title="Chuyển khoản đúng nội dung"
        body="Số tiền và nội dung đã được điền sẵn trong mã QR. Chuyển khoản tay thì phải khớp đúng, sai nội dung sẽ phải đối soát thủ công."
      />

      <AppCard>
        <YStack p="$4" g="$3" items="center">
          <Image
            source={{ uri: order.bank.qrUrl }}
            style={{ width: 220, height: 220 }}
            contentFit="contain"
            accessibilityLabel={`Mã QR chuyển khoản ${formatVnd(order.bank.amount)}`}
          />
          <Text ff="$body" fs="$1" lh="$2" color="$inkSoft" text="center">Mở ứng dụng ngân hàng có VietQR và quét mã.</Text>
        </YStack>
      </AppCard>

      <AppCard>
        <YStack px="$4" pt="$1" pb="$2">
          <CopyRow label="Ngân hàng" value={order.bank.bankName} copied={copiedKey === "bank"} onCopy={() => copy("bank", order.bank.bankName)} />
          <CopyRow label="Số tài khoản" value={order.bank.accountNumber} copied={copiedKey === "account"} onCopy={() => copy("account", order.bank.accountNumber)} />
          <CopyRow label="Chủ tài khoản" value={order.bank.accountName} copied={copiedKey === "name"} onCopy={() => copy("name", order.bank.accountName)} />
          <CopyRow label="Số tiền" value={String(order.bank.amount)} display={formatVnd(order.bank.amount)} copied={copiedKey === "amount"} onCopy={() => copy("amount", String(order.bank.amount))} />
          <CopyRow label="Nội dung chuyển khoản" value={order.bank.transferContent} copied={copiedKey === "content"} onCopy={() => copy("content", order.bank.transferContent)} />
        </YStack>
      </AppCard>

      <Text ff="$body" fs="$1" lh="$2" color="$inkSoft" text="center">
        Đơn tự cập nhật khi hệ thống hoặc quản trị viên xác nhận thanh toán. Bạn có thể quay lại sau.
      </Text>
    </YStack>
  );
}

function PaidView({ order, onDone }: { order: MembershipOrder; onDone: () => void }): React.JSX.Element {
  return (
    <YStack g="$4">
      <Notice
        icon="check-circle"
        tone="green"
        title="Thanh toán thành công"
        body={`Đơn ${order.transferContent} đã được xác nhận. Premium có hiệu lực đến ${formatDate(order.expiresAt)}.`}
      />
      <AppCard>
        <YStack p="$4" g="$1.5">
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Số tiền</Text><Text ff="$body" fs="$2" fw="$6" color="$ink">{formatVnd(order.priceVnd)}</Text></XStack>
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Thanh toán lúc</Text><Text ff="$body" fs="$2" fw="$6" color="$ink">{formatDate(order.paidAt)}</Text></XStack>
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Hết hạn</Text><Text ff="$body" fs="$2" fw="$6" color="$ink">{formatDate(order.expiresAt)}</Text></XStack>
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Trạng thái</Text><Text ff="$body" fs="$2" fw="$6" color="#55714A">{ORDER_STATUS_LABELS.paid}</Text></XStack>
        </YStack>
      </AppCard>
      <PrimaryButton label="Xong" onPress={onDone} />
    </YStack>
  );
}

function ReviewView({ order, onBack }: { order: MembershipOrder; onBack: () => void }): React.JSX.Element {
  const reason = order.reviewReason ? REVIEW_REASON_LABELS[order.reviewReason] ?? order.reviewReason : null;
  return (
    <YStack g="$4">
      <Notice
        icon="clock"
        tone="bronze"
        title="Đang kiểm tra giao dịch"
        body={`Hệ thống đã ghi nhận thanh toán của đơn ${order.transferContent} và đang đối soát. Không cần chuyển thêm.${reason ? ` Lý do: ${reason}` : ""}`}
      />
      <AppCard>
        <YStack p="$4" g="$1.5">
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Số tiền</Text><Text ff="$body" fs="$2" fw="$6" color="$ink">{formatVnd(order.priceVnd)}</Text></XStack>
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Tạo lúc</Text><Text ff="$body" fs="$2" fw="$6" color="$ink">{formatDate(order.createdAt)}</Text></XStack>
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Trạng thái</Text><Text ff="$body" fs="$2" fw="$6" color="#B58A3C">{ORDER_STATUS_LABELS.needs_review}</Text></XStack>
        </YStack>
      </AppCard>
      <PrimaryButton secondary label="Quay lại gói Premium" onPress={onBack} />
    </YStack>
  );
}

function RejectedView({ order, onBack }: { order: MembershipOrder; onBack: () => void }): React.JSX.Element {
  return (
    <YStack g="$4">
      <Notice
        icon="alert-triangle"
        tone="vermilion"
        title="Đơn bị từ chối"
        body={order.rejectionReason ?? "Giao dịch không khớp với đơn hàng."}
      />
      <PrimaryButton label="Tạo đơn mới" onPress={onBack} />
      <PrimaryButton secondary label="Quay lại gói Premium" onPress={onBack} />
    </YStack>
  );
}

export function PaymentScreen({ orderId, onBack, onDone }: {
  orderId: string;
  onBack: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const cache = useQueryClient();
  const order = useOrderPolling(orderId || null);
  const status = order.data?.status;

  useEffect(() => {
    if (status !== "paid") return;
    void cache.invalidateQueries({ queryKey: membershipKeys.status });
    void cache.invalidateQueries({ queryKey: membershipKeys.orders });
  }, [status, cache]);

  return (
    <YStack f={1} bg="$paper" pt={insets.top}>
      <AppHeader title="Thanh toán" onBack={onBack} avatar={false} />
      <ScrollView f={1} bg="$paper" showsVerticalScrollIndicator={false}>
        <YStack px="$4" pt="$3" pb={insets.bottom + 24} g="$4">
          {order.isPending ? (
            <YStack items="center" py="$8"><Spinner color="$vermilion" accessibilityLabel="Đang tải đơn thanh toán" /></YStack>
          ) : order.isError || !order.data ? (
            <YStack items="center" g="$3" py="$8">
              <Text ff="$body" fs="$2" lh="$3" color="$inkSoft" text="center">Chưa tải được đơn thanh toán. Kiểm tra kết nối và thử lại.</Text>
              <PrimaryButton secondary label="Thử lại" onPress={() => { void order.refetch(); }} />
              <PrimaryButton secondary label="Quay lại" onPress={onBack} />
            </YStack>
          ) : status === "paid" ? (
            <PaidView order={order.data} onDone={onDone} />
          ) : status === "rejected" ? (
            <RejectedView order={order.data} onBack={onBack} />
          ) : status === "needs_review" ? (
            <ReviewView order={order.data} onBack={onBack} />
          ) : (
            <>
              <SectionHeader title={ORDER_STATUS_LABELS[status ?? "pending"]} />
              <TransferView order={order.data} />
            </>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
