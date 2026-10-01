import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { formatCurrency, formatDate } from "../lib/format";
import { StatusBadge } from "../components/StatusBadge";
import type { Invoice, InvoiceStatus } from "../lib/types";
import type { RootStackParamList } from "../navigation";

const tabs: { label: string; value: InvoiceStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Partial", value: "PARTIALLY_PAID" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
];

export function InvoicesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<InvoiceStatus | "ALL">("ALL");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await api.invoices.list(tab === "ALL" ? undefined : { status: tab });
    setInvoices(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity key={t.value} onPress={() => setTab(t.value)} style={[styles.tab, tab === t.value && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No invoices in this view.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("InvoiceDetail", { id: item.id })}>
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

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NewInvoice")}>
        <Text style={styles.fabText}>+ New invoice</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  tabsRow: { flexGrow: 0, paddingHorizontal: 12, paddingTop: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginRight: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { fontSize: 13, color: colors.inkLight, fontWeight: "500" },
  tabTextActive: { color: "#fff" },
  empty: { color: colors.inkLight, fontSize: 14, marginTop: 24, textAlign: "center" },
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
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
