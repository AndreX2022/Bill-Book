import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert, Linking } from "react-native";
import { useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { formatCurrency, formatDate } from "../lib/format";
import { StatusBadge } from "../components/StatusBadge";
import type { Business, Invoice } from "../lib/types";
import type { RootStackParamList } from "../navigation";

type DetailRoute = RouteProp<RootStackParamList, "InvoiceDetail">;

export function InvoiceDetailScreen() {
  const { params } = useRoute<DetailRoute>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  const load = useCallback(async () => {
    const [inv, biz] = await Promise.all([api.invoices.get(params.id), api.business.get()]);
    setInvoice(inv);
    setBusiness(biz);
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function markSent() {
    setBusy(true);
    try {
      await api.invoices.setStatus(params.id, "SENT");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment() {
    if (!paymentAmount) return;
    setBusy(true);
    try {
      await api.invoices.addPayment(params.id, { amount: Number(paymentAmount), mode: "cash" });
      setPaymentAmount("");
      setShowPayment(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function shareWhatsApp() {
    if (!invoice) return;
    const text = `Invoice ${invoice.number} from ${business?.name || ""}\nAmount: ${formatCurrency(
      invoice.grandTotal
    )}\n${invoice.dueDate ? `Due: ${formatDate(invoice.dueDate)}\n` : ""}`;
    const phone = (invoice.customer.phone || "").replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`).catch(() =>
      Alert.alert("Couldn't open WhatsApp", "Is it installed on this device?")
    );
  }

  async function sharePdf() {
    if (!invoice || !business) return;
    try {
      const { uri } = await Print.printToFileAsync({ html: buildInvoiceHtml(invoice, business) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: invoice.number });
      }
    } catch {
      Alert.alert("Couldn't generate PDF");
    }
  }

  if (loading || !invoice) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const due = invoice.grandTotal - invoice.amountPaid;
  const interState = business
    ? business.state.trim().toLowerCase() !== invoice.customer.state.trim().toLowerCase()
    : false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.actionsRow}>
        {invoice.status === "DRAFT" && (
          <TouchableOpacity style={styles.actionBtn} onPress={markSent} disabled={busy}>
            <Text style={styles.actionBtnText}>Mark sent</Text>
          </TouchableOpacity>
        )}
        {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPayment((s) => !s)}>
            <Text style={styles.actionBtnText}>Record payment</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionBtn} onPress={shareWhatsApp}>
          <Text style={styles.actionBtnText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnPrimary} onPress={sharePdf}>
          <Text style={styles.actionBtnTextPrimary}>Share PDF</Text>
        </TouchableOpacity>
      </View>

      {showPayment && (
        <View style={styles.paymentBox}>
          <TextInput
            style={styles.paymentInput}
            placeholder={`Up to ${formatCurrency(due)}`}
            placeholderTextColor={colors.inkLight}
            keyboardType="numeric"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
          />
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={recordPayment} disabled={busy}>
            <Text style={styles.actionBtnTextPrimary}>Record</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.bizName}>{business?.name}</Text>
            {business?.gstin && <Text style={styles.muted}>GSTIN: {business.gstin}</Text>}
            <Text style={styles.muted}>{business?.state}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.invTitle}>{invoice.number}</Text>
            <Text style={styles.muted}>{formatDate(invoice.date)}</Text>
            <View style={{ marginTop: 4 }}>
              <StatusBadge status={invoice.status} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bill to</Text>
          <Text style={styles.bizName}>{invoice.customer.name}</Text>
          {invoice.customer.gstin && <Text style={styles.muted}>GSTIN: {invoice.customer.gstin}</Text>}
          <Text style={styles.muted}>{invoice.customer.state}</Text>
        </View>

        <View style={styles.section}>
          {invoice.items.map((li) => (
            <View key={li.id} style={styles.lineItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineDesc}>{li.description}</Text>
                <Text style={styles.muted}>
                  {li.quantity} × {formatCurrency(li.rate)} · GST {li.gstRate}%
                </Text>
              </View>
              <Text style={styles.lineTotal}>{formatCurrency(li.total)}</Text>
            </View>
          ))}
        </View>

        <View>
          <TotalRow label="Taxable value" value={invoice.taxableValue} />
          {interState ? (
            <TotalRow label="IGST" value={invoice.igst} />
          ) : (
            <>
              <TotalRow label="CGST" value={invoice.cgst} />
              <TotalRow label="SGST" value={invoice.sgst} />
            </>
          )}
          <TotalRow label="Round off" value={invoice.roundOff} />
          <TotalRow label="Grand total" value={invoice.grandTotal} bold />
          {invoice.amountPaid > 0 && (
            <>
              <TotalRow label="Paid" value={invoice.amountPaid} />
              <TotalRow label="Balance due" value={due} bold />
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={bold ? styles.totalLabelBold : styles.totalLabel}>{label}</Text>
      <Text style={bold ? styles.totalValueBold : styles.totalValue}>{formatCurrency(value)}</Text>
    </View>
  );
}

function buildInvoiceHtml(invoice: Invoice, business: Business): string {
  const interState = business.state.trim().toLowerCase() !== invoice.customer.state.trim().toLowerCase();
  const rows = invoice.items
    .map(
      (li) => `<tr>
        <td>${li.description}</td>
        <td>${li.hsnCode || ""}</td>
        <td style="text-align:right">${li.quantity}</td>
        <td style="text-align:right">${formatCurrency(li.rate)}</td>
        <td style="text-align:right">${li.gstRate}%</td>
        <td style="text-align:right">${formatCurrency(li.total)}</td>
      </tr>`
    )
    .join("");

  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: Helvetica, Arial, sans-serif; color:#1B2A4A; padding: 24px;">
        <h2 style="margin-bottom:0;">${business.name}</h2>
        <p style="color:#5B6472; margin-top:4px;">${business.gstin ? "GSTIN: " + business.gstin + " · " : ""}${business.state}</p>
        <h3>Tax Invoice ${invoice.number}</h3>
        <p>Date: ${formatDate(invoice.date)}${invoice.dueDate ? " · Due: " + formatDate(invoice.dueDate) : ""}</p>
        <p><strong>Bill to:</strong> ${invoice.customer.name}${
    invoice.customer.gstin ? " (GSTIN " + invoice.customer.gstin + ")" : ""
  }, ${invoice.customer.state}</p>
        <table width="100%" style="border-collapse: collapse; margin-top: 16px;" cellpadding="6">
          <thead>
            <tr style="border-bottom: 2px solid #1B2A4A; text-align:left;">
              <th>Description</th><th>HSN</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:16px; text-align:right;">
          <p>Taxable value: ${formatCurrency(invoice.taxableValue)}</p>
          ${
            interState
              ? `<p>IGST: ${formatCurrency(invoice.igst)}</p>`
              : `<p>CGST: ${formatCurrency(invoice.cgst)}</p><p>SGST: ${formatCurrency(invoice.sgst)}</p>`
          }
          <p>Round off: ${formatCurrency(invoice.roundOff)}</p>
          <h3>Grand total: ${formatCurrency(invoice.grandTotal)}</h3>
        </div>
      </body>
    </html>
  `;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  actionBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  actionBtnText: { color: colors.ink, fontWeight: "500", fontSize: 13 },
  actionBtnPrimary: { backgroundColor: colors.ink, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, justifyContent: "center" },
  actionBtnTextPrimary: { color: "#fff", fontWeight: "600", fontSize: 13, textAlign: "center" },
  paymentBox: { flexDirection: "row", gap: 8, marginBottom: 12 },
  paymentInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 10, backgroundColor: colors.card, color: colors.ink },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  bizName: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  invTitle: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  muted: { color: colors.inkLight, fontSize: 12, marginTop: 2 },
  section: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12, marginBottom: 12 },
  sectionLabel: { fontSize: 11, color: colors.inkLight, textTransform: "uppercase", marginBottom: 4 },
  lineItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  lineDesc: { color: colors.ink, fontSize: 13, fontWeight: "500" },
  lineTotal: { color: colors.ink, fontSize: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { color: colors.inkLight, fontSize: 13 },
  totalValue: { color: colors.inkLight, fontSize: 13 },
  totalLabelBold: { color: colors.ink, fontSize: 14, fontWeight: "700", marginTop: 4 },
  totalValueBold: { color: colors.ink, fontSize: 14, fontWeight: "700", marginTop: 4 },
});
