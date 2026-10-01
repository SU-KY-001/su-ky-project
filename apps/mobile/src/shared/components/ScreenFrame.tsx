import type { PropsWithChildren } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { colors } from "@/shared/theme";

export function ScreenFrame({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.frame}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
