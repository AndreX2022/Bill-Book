import { View, Text, StyleSheet } from "react-native";
import { statusColors, statusLabels } from "../lib/theme";
import type { InvoiceStatus } from "../lib/types";

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const c = statusColors[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{statusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: "flex-start" },
  text: { fontSize: 11, fontWeight: "600" },
});
