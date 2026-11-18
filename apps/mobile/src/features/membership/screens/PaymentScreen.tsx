import { useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Button, ScrollView, Text, XStack, YStack } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppCard, AppHeader, AppIcon, PrimaryButton, SectionHeader, type IconName } from "@/shared/ui";
import { MockQr } from "../components/MockQr";
import {
  ORDER_STATUS_LABELS,
  formatDate,
  formatVnd,
  useMockMembership,
  type MembershipOrder,
} from "../mock";

const COPY_FEEDBACK_MS = 1_800;

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
        <Text ff="$body" fs="$1" fw="$6" color={copied ? "$bronze" : "$inkSoft"}>{copied ? "Đã chép" : "Sao chép"}</Text>
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

function TransferView({ order, onPaid, onReview, onRejected, onRestart }: { order: MembershipOrder; onPaid: () => void; onReview: () => void; onRejected: () => void; onRestart: () => void }): React.JSX.Element {
  const store = useMockMembership();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(true);
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
        <Text ff="$heading" fs="$7" lh="$7" fw="$7" color="$vermilion">{formatVnd(order.priceVnd)}</Text>
        <Text ff="$body" fs="$2" color="$inkSoft">Mã đơn {order.transferContent}</Text>
      </YStack>

      <Notice
        icon="info"
        tone="bronze"
        title="Chuyển khoản đúng nội dung"
        body="Sao chép từng thông tin bên dưới và dán vào ứng dụng ngân hàng. Sai nội dung, đơn sẽ phải đối soát thủ công."
      />

      <AppCard>
        <YStack px="$4" pt="$1" pb="$2">
          <CopyRow label="Ngân hàng" value={order.bank.bankName} copied={copiedKey === "bank"} onCopy={() => copy("bank", order.bank.bankName)} />
          <CopyRow label="Số tài khoản" value={order.bank.accountNumber} copied={copiedKey === "account"} onCopy={() => copy("account", order.bank.accountNumber)} />
          <CopyRow label="Chủ tài khoản" value={order.bank.accountName} copied={copiedKey === "name"} onCopy={() => copy("name", order.bank.accountName)} />
          <CopyRow label="Số tiền" value={String(order.bank.amount)} display={formatVnd(order.bank.amount)} copied={copiedKey === "amount"} onCopy={() => copy("amount", String(order.bank.amount))} />
          <CopyRow label="Nội dung chuyển khoản" value={order.bank.transferContent} copied={copiedKey === "content"} onCopy={() => copy("content", order.bank.transferContent)} />
        </YStack>
      </AppCard>

      <Button unstyled onPress={() => setQrOpen((open) => !open)} accessibilityRole="button" accessibilityLabel={qrOpen ? "Ẩn mã QR" : "Mở mã QR"}>
        <XStack items="center" justify="space-between" py="$2">
          <XStack items="center" g="$2">
            <AppIcon name="maximize" size={16} color="#5B4E44" />
            <Text ff="$body" fs="$2" fw="$6" color="$ink">Quét bằng thiết bị khác</Text>
          </XStack>
          <AppIcon name={qrOpen ? "chevron-up" : "chevron-down"} size={18} color="#5B4E44" />
        </XStack>
      </Button>
      {qrOpen ? (
        <AppCard>
          <YStack p="$4" g="$3" items="center">
            <MockQr />
            <Text ff="$body" fs="$1" lh="$2" color="$inkSoft" text="center">
              Mã QR minh hoạ, chưa quét được. Khi nối API thanh toán, mã QR chuyển khoản thật sẽ hiển thị tại đây để quét bằng thiết bị khác.
            </Text>
          </YStack>
        </AppCard>
      ) : null}

      <Text ff="$body" fs="$1" lh="$2" color="$inkSoft" text="center">
        Đơn được cập nhật khi quản trị viên duyệt. Bạn có thể quay lại sau.
      </Text>

      <YStack g="$2" pt="$2">
        <Text ff="$body" fs="$1" fw="$7" ls="$1" color="$inkSoft" text="center">BẢN XEM TRƯỚC · GIẢ LẬP KẾT QUẢ</Text>
        <PrimaryButton label="Giả lập đã thanh toán" onPress={() => { store.markPaid(order.id); onPaid(); }} />
        <PrimaryButton secondary label="Giả lập cần đối soát" onPress={() => { store.markNeedsReview(order.id); onReview(); }} />
        <PrimaryButton secondary label="Giả lập bị từ chối" onPress={() => { store.markRejected(order.id); onRejected(); }} />
        <Button unstyled onPress={onRestart} accessibilityRole="button">
          <Text ff="$body" fs="$2" color="$inkSoft" text="center">Tạo đơn mới</Text>
        </Button>
      </YStack>
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
        body={`Đơn ${order.transferContent} đã được duyệt. Premium có hiệu lực đến ${formatDate(order.expiresAt)}.`}
      />
      <AppCard>
        <YStack p="$4" g="$1.5">
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Số tiền</Text><Text ff="$body" fs="$2" fw="$6" color="$ink">{formatVnd(order.priceVnd)}</Text></XStack>
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Hết hạn</Text><Text ff="$body" fs="$2" fw="$6" color="$ink">{formatDate(order.expiresAt)}</Text></XStack>
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Trạng thái</Text><Text ff="$body" fs="$2" fw="$6" color="#55714A">{ORDER_STATUS_LABELS.paid}</Text></XStack>
        </YStack>
      </AppCard>
      <PrimaryButton label="Xong" onPress={onDone} />
    </YStack>
  );
}

function ReviewView({ order, onPaid, onRejected, onBack }: { order: MembershipOrder; onPaid: () => void; onRejected: () => void; onBack: () => void }): React.JSX.Element {
  return (
    <YStack g="$4">
      <Notice
        icon="clock"
        tone="bronze"
        title="Đang kiểm tra giao dịch"
        body={`Đơn ${order.transferContent} đang được đối soát. Premium chưa được kích hoạt cho đến khi có kết quả.`}
      />
      <AppCard>
        <YStack p="$4" g="$1.5">
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Số tiền</Text><Text ff="$body" fs="$2" fw="$6" color="$ink">{formatVnd(order.priceVnd)}</Text></XStack>
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Tạo lúc</Text><Text ff="$body" fs="$2" fw="$6" color="$ink">{formatDate(order.createdAt)}</Text></XStack>
          <XStack justify="space-between"><Text ff="$body" fs="$2" color="$inkSoft">Trạng thái</Text><Text ff="$body" fs="$2" fw="$6" color="#B58A3C">{ORDER_STATUS_LABELS.needs_review}</Text></XStack>
        </YStack>
      </AppCard>
      <YStack g="$2">
        <Text ff="$body" fs="$1" fw="$7" ls="$1" color="$inkSoft" text="center">BẢN XEM TRƯỚC · GIẢ LẬP KẾT QUẢ</Text>
        <PrimaryButton label="Giả lập duyệt đơn" onPress={onPaid} />
        <PrimaryButton secondary label="Giả lập bị từ chối" onPress={onRejected} />
        <PrimaryButton secondary label="Quay lại gói Premium" onPress={onBack} />
      </YStack>
    </YStack>
  );
}

function RejectedView({ order, onRestart, onBack }: { order: MembershipOrder; onRestart: () => void; onBack: () => void }): React.JSX.Element {
  return (
    <YStack g="$4">
      <Notice
        icon="alert-triangle"
        tone="vermilion"
        title="Đơn bị từ chối"
        body={order.rejectionReason ?? "Giao dịch không khớp với đơn hàng."}
      />
      <PrimaryButton label="Tạo đơn mới" onPress={onRestart} />
      <PrimaryButton secondary label="Quay lại gói Premium" onPress={onBack} />
    </YStack>
  );
}

export function PaymentScreen({ orderId, onBack, onRestart, onDone }: {
  orderId: string;
  onBack: () => void;
  onRestart: (orderId: string) => void;
  onDone: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const store = useMockMembership();
  const [status, setStatus] = useState<MembershipOrder["status"] | null>(null);
  const order = store.orders.find((item) => item.id === orderId);
  const currentStatus = status ?? order?.status ?? null;

  const restart = (): void => {
    const created = store.createOrder();
    setStatus(null);
    onRestart(created.id);
  };

  return (
    <YStack f={1} bg="$paper" pt={insets.top}>
      <AppHeader title="Thanh toán" onBack={onBack} />
      <ScrollView f={1} bg="$paper" showsVerticalScrollIndicator={false}>
        <YStack px="$4" pt="$3" pb={insets.bottom + 24} g="$4">
          {!order ? (
            <Notice icon="alert-circle" tone="vermilion" title="Không tìm thấy đơn" body="Đơn hàng không tồn tại trong bản xem trước." />
          ) : currentStatus === "paid" ? (
            <PaidView order={order} onDone={onDone} />
          ) : currentStatus === "rejected" ? (
            <RejectedView order={order} onRestart={restart} onBack={onBack} />
          ) : currentStatus === "needs_review" ? (
            <ReviewView
              order={order}
              onPaid={() => { store.markPaid(order.id); setStatus("paid"); }}
              onRejected={() => { store.markRejected(order.id); setStatus("rejected"); }}
              onBack={onBack}
            />
          ) : (
            <>
              <SectionHeader title={ORDER_STATUS_LABELS[currentStatus ?? "pending"]} />
              <TransferView order={order} onPaid={() => setStatus("paid")} onReview={() => setStatus("needs_review")} onRejected={() => setStatus("rejected")} onRestart={restart} />
            </>
          )}
          {!order ? <PrimaryButton secondary label="Quay lại" onPress={onBack} /> : null}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
