import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

export function ScreenContainer({ children, ...props }: PropsWithChildren<ViewProps>) {
  return (
    <View style={styles.outer} {...props}>
      <SafeAreaView style={styles.safe}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#0B1020" },
  safe: { flex: 1 },
});
