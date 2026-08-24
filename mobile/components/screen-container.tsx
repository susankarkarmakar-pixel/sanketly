import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

export interface ScreenContainerProps extends ViewProps {
  edges?: Edge[];
}

export function ScreenContainer({ children, edges = ["top", "left", "right"], ...props }: PropsWithChildren<ScreenContainerProps>) {
  return (
    <View style={styles.outer} {...props}>
      <SafeAreaView edges={edges} style={styles.safe}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#0B1020" },
  safe: { flex: 1 },
});
