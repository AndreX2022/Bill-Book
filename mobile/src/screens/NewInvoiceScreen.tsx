import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { formatCurrency } from "../lib/format";
import { calculateLineItem, sumInvoiceTotals } from "../lib/gst";
import { PickerModal } from "../components/PickerModal";
import type { Business, Customer, Item } from "../lib/types";
import type { RootStackParamList } from "../navigation";

interface LineRow {
  key: string;
  itemId?: string;
  description: string;
  hsnCode: string;
  quantity: string;
  rate: string;
  discountPct: string;
  gstRate: string;
}

function newRow(): LineRow {
  return {
    key: Math.random().toString(36).slice(2),
    description: "",
    hsnCode: "",
    quantity: "1",
    rate: "",
    discountPct: "0",
    gstRate: "18",
  };
}

export function NewInvoiceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rows, setRows] = useState<LineRow[]>([newRow()]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemPickerFor, setItemPickerFor] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");

  useEffect(() => {
    Promise.all([api.business.get(), api.customers.list(), api.items.list()]).then(([b, c, i]) => {
      setBusiness(b);
      setCustomers(c);
      setItems(i);
    });
  }, []);

  const computedRows = useMemo(() => {
    if (!business || !customer) return [];
    return rows.map((r) => {
      const breakdown = calculateLineItem({
        quantity: Number(r.quantity) || 0,
        rate: Number(r.rate) || 0,
        discountPercent: Number(r.discountPct) || 0,
        gstRate: Number(r.gstRate) || 0,
        businessState: business.state,
        customerState: customer.state,
      });
      return { ...r, ...breakdown };
    });
  }, [rows, business, customer]);

  const totals = useMemo(() => sumInvoiceTotals(computedRows), [computedRows]);
  const interState =
    business && customer ? business.state.trim().toLowerCase() !== customer.state.trim().toLowerCase() : false;

  function updateRow(key: string, patch: Partial<LineRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function applyItem(key: string, item: Item) {
    updateRow(key, {
      itemId: item.id,
      description: item.name,
      hsnCode: item.hsnCode || "",
      rate: String(item.salePrice),
      gstRate: String(item.gstRate),
    });
    setItemPickerFor(null);
    setItemSearch("");
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  async function save(status: "DRAFT" | "SENT") {
    if (!customer) return Alert.alert("Choose a customer first");
    if (rows.some((r) => !r.description || !Number(r.quantity) || !Number(r.rate))) {
      return Alert.alert("Every line needs a description, quantity and rate");
    }
    setSaving(true);
    try {
      const invoice = await api.invoices.create({
        customerId: customer.id,
        notes: notes || undefined,
        status,
        lineItems: rows.map((r) => ({
          itemId: r.itemId,
          description: r.description,
          hsnCode: r.hsnCode || undefined,
          quantity: Number(r.quantity),
          rate: Number(r.rate),
          discountPct: Number(r.discountPct) || 0,
          gstRate: Number(r.gstRate) || 0,
        })),
      });
      navigation.replace("InvoiceDetail", { id: invoice.id });
    } catch (err: any) {
      Alert.alert("Couldn't save invoice", err.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredCustomers = customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
  const filteredItems = items.filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase()));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity style={styles.selectBox} onPress={() => setCustomerPickerOpen(true)}>
        <Text style={styles.selectLabel}>Customer</Text>
        <Text style={styles.selectValue}>{customer ? `${customer.name} (${customer.state})` : "Tap to choose"}</Text>
      </TouchableOpacity>

      {customer && (
        <Text style={styles.taxNote}>{interState ? "IGST applies (inter-state)" : "CGST + SGST applies (same state)"}</Text>
      )}

      <Text style={styles.sectionTitle}>Line items</Text>
      {computedRows.map((r, idx) => (
        <View key={r.key} style={styles.lineCard}>
          <View style={styles.lineCardHeader}>
            <Text style={styles.lineIndex}>#{idx + 1}</Text>
            <TouchableOpacity onPress={() => removeRow(r.key)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.itemPickBtn}
            onPress={() => {
              setItemPickerFor(r.key);
              setItemSearch("");
            }}
          >
            <Text style={styles.itemPickText}>Pick from items (optional)</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Description"
            placeholderTextColor={colors.inkLight}
            value={r.description}
            onChangeText={(v) => updateRow(r.key, { description: v })}
          />
          <View style={styles.row3}>
            <TextInput
              style={[styles.input, styles.inputThird]}
              placeholder="Qty"
              placeholderTextColor={colors.inkLight}
              keyboardType="numeric"
              value={r.quantity}
              onChangeText={(v) => updateRow(r.key, { quantity: v })}
            />
            <TextInput
              style={[styles.input, styles.inputThird]}
              placeholder="Rate"
              placeholderTextColor={colors.inkLight}
              keyboardType="numeric"
              value={r.rate}
              onChangeText={(v) => updateRow(r.key, { rate: v })}
            />
            <TextInput
              style={[styles.input, styles.inputThird]}
              placeholder="GST%"
              placeholderTextColor={colors.inkLight}
              keyboardType="numeric"
              value={r.gstRate}
              onChangeText={(v) => updateRow(r.key, { gstRate: v })}
            />
          </View>
          <Text style={styles.lineTotal}>{formatCurrency(r.total || 0)}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.addLineBtn} onPress={addRow}>
        <Text style={styles.addLineText}>+ Add line</Text>
      </TouchableOpacity>

      <TextInput
        style={[styles.input, { height: 70, marginTop: 16 }]}
        placeholder="Notes"
        placeholderTextColor={colors.inkLight}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <View style={styles.totalsBox}>
        <TotalLine label="Taxable value" value={totals.taxableValue} />
        {interState ? (
          <TotalLine label="IGST" value={totals.igst} />
        ) : (
          <>
            <TotalLine label="CGST" value={totals.cgst} />
            <TotalLine label="SGST" value={totals.sgst} />
          </>
        )}
        <TotalLine label="Round off" value={totals.roundOff} />
        <TotalLine label="Grand total" value={totals.grandTotal} bold />
      </View>

      <View style={styles.saveRow}>
        <TouchableOpacity style={styles.draftBtn} onPress={() => save("DRAFT")} disabled={saving}>
          <Text style={styles.draftBtnText}>Save as draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendBtn} onPress={() => save("SENT")} disabled={saving}>
          <Text style={styles.sendBtnText}>{saving ? "Saving…" : "Save and send"}</Text>
        </TouchableOpacity>
      </View>

      <PickerModal
        visible={customerPickerOpen}
        title="Choose customer"
        items={filteredCustomers}
        keyExtractor={(c) => c.id}
        labelExtractor={(c) => c.name}
        subLabelExtractor={(c) => c.state}
        onSelect={(c) => {
          setCustomer(c);
          setCustomerPickerOpen(false);
        }}
        onClose={() => setCustomerPickerOpen(false)}
        search={customerSearch}
        onSearchChange={setCustomerSearch}
      />

      <PickerModal
        visible={!!itemPickerFor}
        title="Choose item"
        items={filteredItems}
        keyExtractor={(i) => i.id}
        labelExtractor={(i) => i.name}
        subLabelExtractor={(i) => formatCurrency(i.salePrice)}
        onSelect={(i) => itemPickerFor && applyItem(itemPickerFor, i)}
        onClose={() => setItemPickerFor(null)}
        search={itemSearch}
        onSearchChange={setItemSearch}
      />
    </ScrollView>
  );
}

function TotalLine({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={bold ? styles.totalLabelBold : styles.totalLabel}>{label}</Text>
      <Text style={bold ? styles.totalValueBold : styles.totalValue}>{formatCurrency(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  selectBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12, marginBottom: 4 },
  selectLabel: { fontSize: 12, color: colors.inkLight },
  selectValue: { fontSize: 15, color: colors.ink, fontWeight: "500", marginTop: 2 },
  taxNote: { fontSize: 12, color: colors.inkLight, marginTop: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: 16, marginBottom: 8 },
  lineCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12, marginBottom: 10 },
  lineCardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  lineIndex: { color: colors.inkLight, fontSize: 12 },
  removeText: { color: colors.red, fontSize: 12, fontWeight: "500" },
  itemPickBtn: { marginBottom: 6 },
  itemPickText: { color: colors.ink, fontSize: 12, textDecorationLine: "underline" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#fff",
    color: colors.ink,
    marginBottom: 8,
    fontSize: 14,
  },
  row3: { flexDirection: "row", gap: 8 },
  inputThird: { flex: 1 },
  lineTotal: { textAlign: "right", color: colors.ink, fontWeight: "600" },
  addLineBtn: { paddingVertical: 8 },
  addLineText: { color: colors.ink, fontWeight: "600" },
  totalsBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12, marginTop: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { color: colors.inkLight, fontSize: 13 },
  totalValue: { color: colors.inkLight, fontSize: 13 },
  totalLabelBold: { color: colors.ink, fontSize: 14, fontWeight: "700", marginTop: 4 },
  totalValueBold: { color: colors.ink, fontSize: 14, fontWeight: "700", marginTop: 4 },
  saveRow: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 32 },
  draftBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12, alignItems: "center", backgroundColor: colors.card },
  draftBtnText: { color: colors.ink, fontWeight: "600" },
  sendBtn: { flex: 1, backgroundColor: colors.ink, borderRadius: 6, padding: 12, alignItems: "center" },
  sendBtnText: { color: "#fff", fontWeight: "600" },
});
