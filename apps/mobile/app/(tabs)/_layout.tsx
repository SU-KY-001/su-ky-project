import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarLabelPosition: "below-icon" }}>
      <Tabs.Screen name="index" options={{ title: "Trang chủ" }} />
      <Tabs.Screen name="timeline" options={{ title: "Dòng thời gian" }} />
      <Tabs.Screen name="catalog" options={{ title: "Thư viện" }} />
    </Tabs>
  );
}
