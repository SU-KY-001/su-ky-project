import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/app/providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="episodes/[slug]"
          options={{ title: "Tập podcast", presentation: "card" }}
        />
        <Stack.Screen name="+not-found" options={{ title: "Không tìm thấy" }} />
      </Stack>
    </AppProviders>
  );
}
