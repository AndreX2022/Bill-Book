export const colors = {
  ink: "#1B2A4A",
  inkLight: "#5B6472",
  paper: "#FAFAF8",
  card: "#FFFFFF",
  border: "#E4E1DA",
  red: "#B23A3A",
  green: "#2F6F4E",
  amber: "#A9720C",
};

export const statusColors: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: "#F1F0EC", fg: colors.inkLight },
  SENT: { bg: "#EFF6FF", fg: "#1D4ED8" },
  PARTIALLY_PAID: { bg: "#FEF3E2", fg: colors.amber },
  PAID: { bg: "#ECFDF5", fg: colors.green },
  OVERDUE: { bg: "#FEF2F2", fg: colors.red },
  CANCELLED: { bg: "#F1F0EC", fg: colors.inkLight },
};

export const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};
