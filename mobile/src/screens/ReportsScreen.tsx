import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { formatCurrency, formatDate } from "../lib/format";
import { StatTile } from "../components/StatTile";

export function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState<Awaited<ReturnType<typeof api.reports.salesSummary>> | null>(null);
  const [gst, setGst] = useState<Awaited<ReturnType<typeof api.reports.gstSummary>> | null>(null);
  const [stock, setStock] = useState<Awaited<ReturnType<typeof api.reports.stockSummary>>>([]);
  const [outstanding, setOutstanding] = useState<Awaited<ReturnType<typeof api.reports.outstanding>>>([]);

  const load = useCallback(async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const params = { from: monthStart.toISOString() };
    const [s, g, st, out] = await Promise.all([
      api.reports.salesSummary(params),
      api.reports.gstSummary(params),
      api.reports.stockSummary(),
      api.reports.outstanding(),
    ]);
    setSales(s);
    setGst(g);
    setStock(st);
    setOutstanding(out);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const lowStock = stock.filter((s) => s.lowStock);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <Text style={styles.header}>Reports</Text>
      <Text style={styles.subheader}>This month. Full GST filing detail is on the web app.</Text>

      <Text style={styles.sectionTitle}>Sales</Text>
      <View style={styles.statsRow}>
        <StatTile label="Invoices" value={String(sales?.invoiceCount || 0)} />
        <StatTile label="Total sales" value={formatCurrency(sales?.totalSales || 0)} />
        <StatTile label="Collected" value={formatCurrency(sales?.totalCollected || 0)} />
        <StatTile label="Outstanding" value={formatCurrency(sales?.totalOutstanding || 0)} />
      </View>

      <Text style={styles.sectionTitle}>GST</Text>
      <View style={styles.statsRow}>
        <StatTile label="Taxable value" value={formatCurrency(gst?.taxableValue || 0)} />
        <StatTile label="CGST" value={formatCurrency(gst?.cgst || 0)} />
        <StatTile label="SGST" value={formatCurrency(gst?.sgst || 0)} />
        <StatTile label="IGST" value={formatCurrency(gst?.igst || 0)} />
      </View>

      <Text style={styles.sectionTitle}>Low stock ({lowStock.length})</Text>
      {lowStock.length === 0 && !loading && <Text style={styles.empty}>Nothing below threshold.</Text>}
      {lowStock.map((s) => (
        <View key={s.id} style={styles.listRow}>
          <Text style={styles.listRowTitle}>{s.name}</Text>
          <Text style={styles.listRowValueDanger}>
            {s.stockQty} {s.unit}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Outstanding dues</Text>
      {outstanding.length === 0 && !loading && <Text style={styles.empty}>Nothing outstanding.</Text>}
      {outstanding.map((o) => (
        <View key={o.id} style={styles.listRow}>
          <View>
            <Text style={styles.listRowTitle}>{o.number}</Text>
            <Text style={styles.listRowSub}>
              {o.customerName}
              {o.dueDate ? ` · due ${formatDate(o.dueDate)}` : ""}
            </Text>
          </View>
          <Text style={styles.listRowValue}>{formatCurrency(o.due)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: { fontSize: 22, fontWeight: "700", color: colors.ink },
  subheader: { fontSize: 13, color: colors.inkLight, marginTop: 2, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: 8, marginBottom: 8 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  empty: { color: colors.inkLight, fontSize: 13, marginBottom: 8 },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  listRowTitle: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  listRowSub: { color: colors.inkLight, fontSize: 11, marginTop: 2 },
  listRowValue: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  listRowValueDanger: { color: colors.red, fontSize: 13, fontWeight: "700" },
});
