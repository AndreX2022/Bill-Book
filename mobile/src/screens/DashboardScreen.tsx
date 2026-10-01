import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { formatCurrency, formatDate } from "../lib/format";
import { StatTile } from "../components/StatTile";
import { StatusBadge } from "../components/StatusBadge";
import type { Invoice } from "../lib/types";
import type { RootStackParamList } from "../navigation";

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState<{ totalSales: number; totalOutstanding: number; invoiceCount: number } | null>(
    null
  );
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recent, setRecent] = useState<Invoice[]>([]);

  const load = useCallback(async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [salesSummary, stock, invoices] = await Promise.all([
      api.reports.salesSummary({ from: monthStart.toISOString() }),
      api.reports.stockSummary(),
      api.invoices.list(),
    ]);
    setSales(salesSummary);
    setLowStockCount(stock.filter((s) => s.lowStock).length);
    setRecent(invoices.slice(0, 8));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <>
          <View style={styles.statsRow}>
            <StatTile label="Sales this month" value={formatCurrency(sales?.totalSales || 0)} />
            <StatTile label="Invoices" value={String(sales?.invoiceCount || 0)} />
            <StatTile
              label="Outstanding"
              value={formatCurrency(sales?.totalOutstanding || 0)}
              tone={sales && sales.totalOutstanding > 0 ? "warning" : undefined}
            />
            <StatTile label="Low stock" value={String(lowStockCount)} tone={lowStockCount > 0 ? "danger" : undefined} />
          </View>
          <Text style={styles.sectionTitle}>Recent invoices</Text>
          {!loading && recent.length === 0 && <Text style={styles.empty}>No invoices yet.</Text>}
        </>
      }
      data={recent}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("InvoiceDetail", { id: item.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.number}</Text>
            <Text style={styles.rowSubtitle}>
              {item.customer.name} · {formatDate(item.date)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.rowAmount}>{formatCurrency(item.grandTotal)}</Text>
            <StatusBadge status={item.status} />
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, marginTop: 8, marginBottom: 8 },
  empty: { color: colors.inkLight, fontSize: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontWeight: "600", color: colors.ink, fontSize: 14 },
  rowSubtitle: { color: colors.inkLight, fontSize: 12, marginTop: 2 },
  rowAmount: { fontWeight: "600", color: colors.ink, fontSize: 14, marginBottom: 4 },
});
