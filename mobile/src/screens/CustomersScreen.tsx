import { useCallback, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import type { Customer } from "../lib/types";

const emptyForm = { name: "", state: "", gstin: "", phone: "", email: "", address: "" };

export function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => setCustomers(await api.customers.list()), []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onSubmit() {
    if (!form.name || !form.state) return Alert.alert("Name and state are required");
    setSaving(true);
    try {
      await api.customers.create(form);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err: any) {
      Alert.alert("Couldn't save customer", err.message);
    } finally {
      setSaving(false);
    }
  }

  function onDelete(id: string) {
    Alert.alert("Delete customer?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.customers.remove(id);
          load();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm((s) => !s)}>
          <Text style={styles.addBtnText}>{showForm ? "Close" : "+ Add"}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Name *" placeholderTextColor={colors.inkLight} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <TextInput style={styles.input} placeholder="State * (e.g. West Bengal)" placeholderTextColor={colors.inkLight} value={form.state} onChangeText={(v) => setForm({ ...form, state: v })} />
          <TextInput style={styles.input} placeholder="GSTIN" placeholderTextColor={colors.inkLight} value={form.gstin} onChangeText={(v) => setForm({ ...form, gstin: v })} />
          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={colors.inkLight} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.inkLight} autoCapitalize="none" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />
          <TextInput style={styles.input} placeholder="Address" placeholderTextColor={colors.inkLight} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save customer"}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={customers}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingTop: showForm ? 0 : 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No customers yet.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>
                {item.state}
                {item.gstin ? ` · ${item.gstin}` : ""}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
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
  deleteText: { color: colors.red, fontSize: 13, fontWeight: "500" },
});
