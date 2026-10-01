import { View, Text, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

export function StatTile({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "warning" ? colors.amber : tone === "danger" ? colors.red : colors.ink;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  label: { fontSize: 12, color: colors.inkLight },
  value: { fontSize: 18, fontWeight: "700", marginTop: 2 },
});
