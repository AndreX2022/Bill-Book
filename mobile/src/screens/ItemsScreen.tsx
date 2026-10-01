import { useCallback, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { formatCurrency } from "../lib/format";
import type { Item } from "../lib/types";

const emptyForm = { name: "", hsnCode: "", unit: "pcs", salePrice: "", gstRate: "18", stockQty: "0", lowStockAt: "0" };

export function ItemsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => setItems(await api.items.list()), []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onSubmit() {
    if (!form.name || !form.salePrice) return Alert.alert("Name and sale price are required");
    setSaving(true);
    try {
      await api.items.create({
        name: form.name,
        hsnCode: form.hsnCode || undefined,
        unit: form.unit,
        salePrice: Number(form.salePrice),
        gstRate: Number(form.gstRate),
        stockQty: Number(form.stockQty),
        lowStockAt: Number(form.lowStockAt),
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err: any) {
      Alert.alert("Couldn't save item", err.message);
    } finally {
      setSaving(false);
    }
  }

  function onDelete(id: string) {
    Alert.alert("Delete item?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.items.remove(id);
          load();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Items</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm((s) => !s)}>
          <Text style={styles.addBtnText}>{showForm ? "Close" : "+ Add"}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Name *" placeholderTextColor={colors.inkLight} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <View style={styles.row3}>
            <TextInput style={[styles.input, styles.third]} placeholder="HSN/SAC" placeholderTextColor={colors.inkLight} value={form.hsnCode} onChangeText={(v) => setForm({ ...form, hsnCode: v })} />
            <TextInput style={[styles.input, styles.third]} placeholder="Unit" placeholderTextColor={colors.inkLight} value={form.unit} onChangeText={(v) => setForm({ ...form, unit: v })} />
            <TextInput style={[styles.input, styles.third]} placeholder="GST %" placeholderTextColor={colors.inkLight} keyboardType="numeric" value={form.gstRate} onChangeText={(v) => setForm({ ...form, gstRate: v })} />
          </View>
          <TextInput style={styles.input} placeholder="Sale price (₹) *" placeholderTextColor={colors.inkLight} keyboardType="numeric" value={form.salePrice} onChangeText={(v) => setForm({ ...form, salePrice: v })} />
          <View style={styles.row3}>
            <TextInput style={[styles.input, styles.half]} placeholder="Opening stock" placeholderTextColor={colors.inkLight} keyboardType="numeric" value={form.stockQty} onChangeText={(v) => setForm({ ...form, stockQty: v })} />
            <TextInput style={[styles.input, styles.half]} placeholder="Low stock alert" placeholderTextColor={colors.inkLight} keyboardType="numeric" value={form.lowStockAt} onChangeText={(v) => setForm({ ...form, lowStockAt: v })} />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save item"}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingTop: showForm ? 0 : 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No items yet.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>
                {formatCurrency(item.salePrice)} · GST {item.gstRate}%
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.stock, item.stockQty <= item.lowStockAt && styles.stockLow]}>
                {item.stockQty} {item.unit}
              </Text>
              <TouchableOpacity onPress={() => onDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8 },
  header: { fontSize: 20, fontWeight: "700", color: colors.ink },
  addBtn: { backgroundColor: colors.ink, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  form: { paddingHorizontal: 16, paddingBottom: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 10, backgroundColor: colors.card, color: colors.ink, marginBottom: 8 },
  row3: { flexDirection: "row", gap: 8 },
  third: { flex: 1 },
  half: { flex: 1 },
  saveBtn: { backgroundColor: colors.ink, borderRadius: 6, padding: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontWeight: "600" },
  empty: { color: colors.inkLight, textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontWeight: "600", color: colors.ink, fontSize: 14 },
  rowSub: { color: colors.inkLight, fontSize: 12, marginTop: 2 },
  stock: { color: colors.ink, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  stockLow: { color: colors.red },
  deleteText: { color: colors.red, fontSize: 12, fontWeight: "500" },
});
