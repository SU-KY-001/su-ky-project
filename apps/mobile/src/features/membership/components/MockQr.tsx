import { View } from "react-native";

const MODULES = 25;
const QUIET_MODULES = 2;

function inFinder(x: number, y: number, originX: number, originY: number): boolean {
  const dx = x - originX;
  const dy = y - originY;
  if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false;
  const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
  return ring === 3 || ring <= 1;
}

function isDark(x: number, y: number): boolean {
  if (inFinder(x, y, 0, 0) || inFinder(x, y, MODULES - 7, 0) || inFinder(x, y, 0, MODULES - 7)) return true;
  if (x === 6 || y === 6) return (x + y) % 2 === 0;
  return (x * 31 + y * 17 + x * y * 7) % 5 < 2;
}

/** Static QR placeholder: no network, no camera payload — mock screens only. */
export function MockQr({ size = 216 }: { size?: number }): React.JSX.Element {
  const cells = MODULES + QUIET_MODULES * 2;
  const cell = size / cells;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Mã QR chuyển khoản minh hoạ"
      style={{ width: size, height: size, backgroundColor: "#FFFFFF", padding: cell * QUIET_MODULES, flexDirection: "column" }}
    >
      {Array.from({ length: MODULES }, (_, y) => (
        <View key={y} style={{ flexDirection: "row" }}>
          {Array.from({ length: MODULES }, (_, x) => (
            <View key={x} style={{ width: cell, height: cell, backgroundColor: isDark(x, y) ? "#1C1714" : "#FFFFFF" }} />
          ))}
        </View>
      ))}
    </View>
  );
}
