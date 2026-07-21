import { Stack } from "expo-router";
import type { ReactElement } from "react";
import { MobileSettingsProvider } from "../src/settings-context";

export default function RootLayout(): ReactElement {
  return (
    <MobileSettingsProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#020617" },
          headerTintColor: "#e5e7eb",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#020617" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Miro", headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </MobileSettingsProvider>
  );
}
