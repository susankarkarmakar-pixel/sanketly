import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SSA_COLORS } from "@/constants/ssa";

type StartupErrorBoundaryProps = PropsWithChildren;
type StartupErrorBoundaryState = { error: Error | null };

export class StartupErrorBoundary extends Component<StartupErrorBoundaryProps, StartupErrorBoundaryState> {
  state: StartupErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): StartupErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SSA startup failure", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.screen} accessibilityRole="alert">
          <Text style={styles.eyebrow}>SANKET SETU ALERT</Text>
          <Text style={styles.title}>অ্যাপ চালু হতে সমস্যা হয়েছে</Text>
          <Text style={styles.body}>SSA শুরু করতে পারেনি। এই বার্তাটি স্ক্রিনশট করে পরীক্ষার দলের সঙ্গে শেয়ার করুন।</Text>
          <View style={styles.errorCard}>
            <Text style={styles.errorLabel}>প্রযুক্তিগত তথ্য</Text>
            <Text selectable style={styles.errorText}>{this.state.error.message || "Unknown startup error"}</Text>
          </View>
          <Text style={styles.help}>ফোনটি একবার বন্ধ করে আবার চালু করুন। সমস্যা থাকলে Android logcat-এর FATAL EXCEPTION অংশ পাঠান।</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SSA_COLORS.background, paddingHorizontal: 24, paddingTop: 72, gap: 16 },
  eyebrow: { color: SSA_COLORS.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: SSA_COLORS.foreground, fontSize: 25, lineHeight: 33, fontWeight: "900" },
  body: { color: SSA_COLORS.muted, fontSize: 15, lineHeight: 23 },
  errorCard: { backgroundColor: SSA_COLORS.surface, borderColor: SSA_COLORS.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  errorLabel: { color: SSA_COLORS.faint, fontSize: 11, fontWeight: "800" },
  errorText: { color: "#FFD6DC", fontSize: 13, lineHeight: 19 },
  help: { color: SSA_COLORS.faint, fontSize: 13, lineHeight: 20 },
});
