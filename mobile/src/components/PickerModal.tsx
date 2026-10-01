import { Modal, View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

interface PickerModalProps<T> {
  visible: boolean;
  title: string;
  items: T[];
  keyExtractor: (item: T) => string;
  labelExtractor: (item: T) => string;
  subLabelExtractor?: (item: T) => string;
  onSelect: (item: T) => void;
  onClose: () => void;
  search: string;
  onSearchChange: (text: string) => void;
}

export function PickerModal<T,>({
  visible,
  title,
  items,
  keyExtractor,
  labelExtractor,
  subLabelExtractor,
  onSelect,
  onClose,
  search,
  onSearchChange,
}: PickerModalProps<T>) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search"
          placeholderTextColor={colors.inkLight}
          value={search}
          onChangeText={onSearchChange}
        />
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
              <Text style={styles.rowLabel}>{labelExtractor(item)}</Text>
              {subLabelExtractor && <Text style={styles.rowSub}>{subLabelExtractor(item)}</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No results.</Text>}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingTop: 56, paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  close: { color: colors.ink, fontWeight: "600" },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    backgroundColor: colors.card,
    color: colors.ink,
  },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 15, color: colors.ink, fontWeight: "500" },
  rowSub: { fontSize: 12, color: colors.inkLight, marginTop: 2 },
  empty: { color: colors.inkLight, textAlign: "center", marginTop: 24 },
});
