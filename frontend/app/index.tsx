import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type Income = { id: string; date: string; product: "Coir Pith" | "Coir Bale"; amount: number; name: string; address: string; status?: "paid" | "pending" };
type Expense = { id: string; date: string; category: "Salaries" | "Current bill" | "Maintenance" | "Husk"; amount: number; repairAmount: number; description: string; costPerTon: number; totalWeight: number; loads?: number; loadWeight?: number; coirOutput?: number; pithOutput?: number; trips?: number };
type Tab = "overview" | "income" | "expenses" | "calendar" | "settings";

const C = { canvas: "#F5F0E7", surface: "#FFFDF8", ink: "#1F2924", muted: "#59635C", line: "#D8D1C4", forest: "#173C2C", income: "#2F7D57", expense: "#B65A43", action: "#C76B35", highlight: "#E8D5A7", nav: "#203029" };
const STORAGE_KEY = "coir-ledger-records-v1";
const TONS_PER_TRIP = 4; // each husk load ~4 tons -> 1 ton coir + 3 ton pith
const money = (v: number) => `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
const displayDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const isPending = (r: Income) => r.status === "pending";

export default function Index() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState<{ kind: "income" | "expense"; id?: string } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) { const saved = JSON.parse(raw); setIncomes(saved.incomes || []); setExpenses(saved.expenses || []); }
      setReady(true);
    });
  }, []);

  useEffect(() => { if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ incomes, expenses })); }, [incomes, expenses, ready]);

  const totalIncome = useMemo(() => incomes.reduce((sum, row) => sum + row.amount, 0), [incomes]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, row) => sum + row.amount + (row.repairAmount || 0), 0), [expenses]);
  const outstanding = useMemo(() => incomes.filter(isPending).reduce((sum, row) => sum + row.amount, 0), [incomes]);

  const remove = (kind: "income" | "expense", id: string) => setConfirm({
    title: "Delete this record?",
    message: "It will be removed from this device only.",
    confirmLabel: "Delete",
    onConfirm: () => kind === "income" ? setIncomes((rows) => rows.filter((row) => row.id !== id)) : setExpenses((rows) => rows.filter((row) => row.id !== id)),
  });
  const toggleStatus = (id: string) => setIncomes((rows) => rows.map((row) => row.id === id ? { ...row, status: isPending(row) ? "paid" : "pending" } : row));
  const open = (kind: "income" | "expense", id?: string) => setEditing({ kind, id });
  const title = tab === "settings" ? "Settings" : tab === "calendar" ? "Calendar" : tab === "income" ? "Income" : tab === "expenses" ? "Expenses" : "Overview";

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>Coir Ledger</Text>
          <View style={s.localRow}><View style={s.dot} /><Text style={s.local}>Stored on this device</Text></View>
        </View>
        <MaterialCommunityIcons name="dots-horizontal" size={24} color={C.muted} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.overline}>{title.toUpperCase()}</Text>
        {tab === "settings" ? (
          <Settings onClear={() => setConfirm({
            title: "Clear all records?",
            message: "This cannot be undone.",
            confirmLabel: "Clear all",
            onConfirm: () => { setIncomes([]); setExpenses([]); },
          })} />
        ) : tab === "calendar" ? (
          <CalendarView incomes={incomes} expenses={expenses} />
        ) : (
          <>
            <Text style={s.greeting}>Good day, operator.</Text>
            <Text style={s.dateContext}>{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</Text>
            <View style={s.summary}>
              <View style={s.netPanel}>
                <Text style={s.panelLabelDark}>NET BALANCE</Text>
                <Text testID="dashboard-net-balance" style={s.netAmount}>{money(totalIncome - totalExpenses)}</Text>
                <Text style={s.netNote}>{totalIncome - totalExpenses >= 0 ? "Available after expenses" : "Expenses are ahead of income"}</Text>
              </View>
              <View style={s.smallTotals}>
                <View><Text style={s.panelLabel}>INCOME</Text><Text testID="dashboard-total-income" style={[s.smallAmount, { color: C.income }]}>{money(totalIncome)}</Text></View>
                <View style={s.divider} />
                <View><Text style={s.panelLabel}>EXPENSES</Text><Text testID="dashboard-total-expenses" style={[s.smallAmount, { color: C.expense }]}>{money(totalExpenses)}</Text></View>
              </View>
            </View>

            {outstanding > 0 && (
              <Pressable testID="outstanding-pill" onPress={() => setTab("income")} style={s.outstandingPill}>
                <MaterialCommunityIcons name="clock-alert-outline" size={17} color={C.action} />
                <Text style={s.outstandingText}><Text style={s.outstandingStrong}>{money(outstanding)}</Text> pending from customers</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={C.action} />
              </Pressable>
            )}

            <View testID="ledger-tabs" style={s.tabs}>
              {(["overview", "income", "expenses", "calendar"] as Tab[]).map((item) => (
                <Pressable key={item} testID={`ledger-tab-${item}`} onPress={() => setTab(item)} style={[s.tab, tab === item && s.selectedTab]}>
                  <Text style={[s.tabText, tab === item && s.selectedTabText]}>{item === "overview" ? "Combined" : item[0].toUpperCase() + item.slice(1)}</Text>
                </Pressable>
              ))}
            </View>

            <Filters query={query} setQuery={setQuery} dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />

            {(tab === "overview" || tab === "income") && <Ledger kind="income" rows={incomes} query={query} dateFrom={dateFrom} dateTo={dateTo} onAdd={() => open("income")} onEdit={(id) => open("income", id)} onDelete={remove} onToggleStatus={toggleStatus} />}
            {(tab === "overview" || tab === "expenses") && <Ledger kind="expense" rows={expenses} query={query} dateFrom={dateFrom} dateTo={dateTo} onAdd={() => open("expense")} onEdit={(id) => open("expense", id)} onDelete={remove} />}
          </>
        )}
      </ScrollView>

      {tab !== "settings" && tab !== "calendar" && (
        <View style={s.fabRow}>
          <ActionButton testID="add-income-button" label="Income" color={C.forest} onPress={() => open("income")} />
          <ActionButton testID="add-expense-button" label="Expense" color={C.action} onPress={() => open("expense")} />
        </View>
      )}

      <View style={s.nav}>
        {([
          { key: "overview", icon: "wallet-outline", label: "Overview" },
          { key: "income", icon: "arrow-down-left", label: "Income" },
          { key: "expenses", icon: "arrow-up-right", label: "Expenses" },
          { key: "calendar", icon: "calendar-month-outline", label: "Calendar" },
          { key: "settings", icon: "cog-outline", label: "Settings" },
        ] as { key: Tab; icon: string; label: string }[]).map((item) => (
          <Pressable key={item.key} testID={`bottom-nav-${item.key}`} style={s.navItem} onPress={() => setTab(item.key)}>
            <MaterialCommunityIcons name={item.icon as any} size={21} color={tab === item.key ? C.highlight : "#B8C1B9"} />
            <Text style={[s.navText, tab === item.key && { color: C.highlight }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {editing && (
        <RecordForm
          kind={editing.kind}
          record={(editing.kind === "income" ? incomes : expenses).find((row) => row.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(record) => {
            if (editing.kind === "income") setIncomes((rows) => editing.id ? rows.map((row) => row.id === editing.id ? record as Income : row) : [record as Income, ...rows]);
            else setExpenses((rows) => editing.id ? rows.map((row) => row.id === editing.id ? record as Expense : row) : [record as Expense, ...rows]);
            setEditing(null);
          }}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        />
      )}
    </SafeAreaView>
  );
}

function ConfirmModal({ title, message, confirmLabel, onCancel, onConfirm }: { title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal animationType="fade" transparent visible onRequestClose={onCancel}>
      <View style={s.confirmWrap}>
        <View testID="confirm-dialog" style={s.confirmCard}>
          <Text style={s.confirmTitle}>{title}</Text>
          <Text style={s.confirmMessage}>{message}</Text>
          <View style={s.confirmButtons}>
            <Pressable testID="confirm-cancel-button" onPress={onCancel} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></Pressable>
            <Pressable testID="confirm-delete-button" onPress={onConfirm} style={s.confirmDanger}><Text style={s.saveText}>{confirmLabel}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({ label, color, onPress, testID }: { label: string; color: string; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} style={[s.fab, { backgroundColor: color }]} onPress={onPress}>
      <MaterialCommunityIcons name="plus" size={19} color="#fff" />
      <Text style={s.fabText}>{label}</Text>
    </Pressable>
  );
}

function Filters({ query, setQuery, dateFrom, dateTo, setDateFrom, setDateTo }: { query: string; setQuery: (v: string) => void; dateFrom: Date | null; dateTo: Date | null; setDateFrom: (v: Date | null) => void; setDateTo: (v: Date | null) => void }) {
  const [picker, setPicker] = useState<null | "from" | "to">(null);
  return (
    <View style={s.filtersWrap}>
      <View style={s.searchRow}>
        <MaterialCommunityIcons name="magnify" size={20} color={C.muted} />
        <TextInput testID="ledger-search-input" value={query} onChangeText={setQuery} placeholder="Search name, product, category…" placeholderTextColor="#9DA49D" style={s.searchInput} returnKeyType="search" />
        {query ? <Pressable testID="search-clear-button" accessibilityLabel="Clear search" onPress={() => setQuery("")}><MaterialCommunityIcons name="close-circle" size={19} color={C.muted} /></Pressable> : null}
      </View>
      <View style={s.dateRangeRow}>
        <Pressable testID="filter-date-from" onPress={() => setPicker("from")} style={s.dateChip}>
          <MaterialCommunityIcons name="calendar-start" size={15} color={C.forest} />
          <Text style={[s.dateChipText, !dateFrom && s.dateChipPlaceholder]}>{dateFrom ? displayDate(dateFrom.toISOString()) : "From"}</Text>
        </Pressable>
        <Pressable testID="filter-date-to" onPress={() => setPicker("to")} style={s.dateChip}>
          <MaterialCommunityIcons name="calendar-end" size={15} color={C.forest} />
          <Text style={[s.dateChipText, !dateTo && s.dateChipPlaceholder]}>{dateTo ? displayDate(dateTo.toISOString()) : "To"}</Text>
        </Pressable>
        {(dateFrom || dateTo) ? <Pressable testID="filter-date-clear" onPress={() => { setDateFrom(null); setDateTo(null); }} style={s.dateClear}><Text style={s.dateClearText}>Clear</Text></Pressable> : null}
      </View>
      {picker && (
        <DateTimePicker
          value={(picker === "from" ? dateFrom : dateTo) || new Date()}
          mode="date"
          display="default"
          onChange={(_, sel) => { setPicker(null); if (sel) { if (picker === "from") setDateFrom(sel); else setDateTo(sel); } }}
        />
      )}
    </View>
  );
}

function Ledger({ kind, rows, query, dateFrom, dateTo, onAdd, onEdit, onDelete, onToggleStatus }: { kind: "income" | "expense"; rows: (Income | Expense)[]; query: string; dateFrom: Date | null; dateTo: Date | null; onAdd: () => void; onEdit: (id: string) => void; onDelete: (kind: "income" | "expense", id: string) => void; onToggleStatus?: (id: string) => void }) {
  const isIncome = kind === "income";
  const [chip, setChip] = useState("All");
  const chips = isIncome ? ["All", "Coir Pith", "Coir Bale"] : ["All", "Salaries", "Current bill", "Maintenance", "Husk"];

  const filtered = rows.filter((row) => {
    if (chip !== "All") { const t = "product" in row ? row.product : row.category; if (t !== chip) return false; }
    if (query.trim()) {
      const hay = ("product" in row ? `${row.product} ${row.name} ${row.address}` : `${row.category} ${row.description}`).toLowerCase();
      if (!hay.includes(query.trim().toLowerCase())) return false;
    }
    const d = new Date(row.date);
    if (dateFrom && d < startOfDay(dateFrom)) return false;
    if (dateTo && d > endOfDay(dateTo)) return false;
    return true;
  });
  const hasFilter = chip !== "All" || !!query.trim() || !!dateFrom || !!dateTo;

  return (
    <View testID={`${kind}-table`} style={s.section}>
      <View style={s.sectionHead}>
        <View>
          <Text style={s.sectionOverline}>{isIncome ? "CASH IN" : "CASH OUT"}</Text>
          <Text style={s.sectionTitle}>{isIncome ? "Income" : "Expenses"}</Text>
        </View>
        <Pressable onPress={onAdd} style={s.addLink}>
          <MaterialCommunityIcons name="plus" size={17} color={C.forest} />
          <Text style={s.addLinkText}>Add</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterRowContent}>
        {chips.map((c) => (
          <Pressable key={c} testID={`${kind}-chip-${c.replace(/\s+/g, "-").toLowerCase()}`} onPress={() => setChip(c)} style={[s.chip, chip === c && s.chipSelected]}>
            <Text style={[s.chipText, chip === c && s.chipTextSelected]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.tableHeader}>
        <Text style={[s.cell, s.dateCell]}>DATE</Text>
        <Text style={s.cell}>{isIncome ? "PRODUCT" : "CATEGORY"}</Text>
        <Text style={[s.cell, s.amountCell]}>AMOUNT</Text>
        <Text style={s.actionCell}> </Text>
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name={hasFilter ? "magnify" : isIncome ? "arrow-down-left" : "arrow-up-right"} size={24} color={hasFilter ? C.muted : isIncome ? C.income : C.expense} />
          <Text style={s.emptyTitle}>{hasFilter ? `No matching ${kind} records` : isIncome ? "No income recorded yet" : "No expenses recorded yet"}</Text>
          <Text style={s.emptyCopy}>{hasFilter ? "Try a different search or filter." : isIncome ? "Add your first Coir Pith or Coir Bale sale." : "Add salaries, current bill, maintenance or husk."}</Text>
        </View>
      ) : filtered.map((row) => {
        const pending = isIncome && isPending(row as Income);
        return (
          <View key={row.id} style={s.row}>
            <Text style={[s.rowText, s.dateCell]}>{displayDate(row.date)}</Text>
            <View style={s.cell}>
              <Text style={s.rowText} numberOfLines={2}>{describeRow(row)}</Text>
              {isIncome && (
                <Pressable testID="income-status-toggle" accessibilityRole="button" accessibilityLabel="Toggle payment status" hitSlop={10} onPress={() => onToggleStatus?.(row.id)} style={[s.badge, pending ? s.badgePending : s.badgePaid]}>
                  <MaterialCommunityIcons name={pending ? "clock-outline" : "check-circle"} size={12} color={pending ? C.action : C.income} />
                  <Text style={[s.badgeText, { color: pending ? C.action : C.income }]}>{pending ? "PENDING" : "PAID"}</Text>
                </Pressable>
              )}
            </View>
            <Text style={[s.rowText, s.amountCell, { color: isIncome ? C.income : C.expense }]}>{money(row.amount + ("repairAmount" in row ? row.repairAmount || 0 : 0))}</Text>
            <View style={s.rowActions}>
              <Pressable testID="record-edit-button" accessibilityLabel="Edit record" onPress={() => onEdit(row.id)}><MaterialCommunityIcons name="pencil-outline" size={19} color={C.muted} /></Pressable>
              <Pressable testID="record-delete-button" accessibilityLabel="Delete record" onPress={() => onDelete(kind, row.id)}><MaterialCommunityIcons name="trash-can-outline" size={19} color={C.expense} /></Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function describeRow(row: Income | Expense) {
  if ("product" in row) return `${row.product}${row.name ? ` · ${row.name}` : ""}`;
  if (row.category === "Husk") return `Husk${row.description ? ` · ${row.description}` : ""}${row.trips ? ` · ${row.trips} trip${row.trips === 1 ? "" : "s"} @ ₹${row.costPerTon}/trip` : ""}`;
  return `${row.category}${row.description ? ` · ${row.description}` : ""}`;
}

function RecordForm({ kind, record, onClose, onSave }: { kind: "income" | "expense"; record?: Income | Expense; onClose: () => void; onSave: (record: Income | Expense) => void }) {
  const [date, setDate] = useState(record ? new Date(record.date) : new Date());
  const [amount, setAmount] = useState(record ? String(record.amount) : "");
  const [choice, setChoice] = useState<string>(record ? ("product" in record ? record.product : record.category) : kind === "income" ? "Coir Pith" : "Salaries");
  const [name, setName] = useState(record && "name" in record ? record.name : "");
  const [address, setAddress] = useState(record && "address" in record ? record.address : "");
  const [status, setStatus] = useState<"paid" | "pending">(record && "status" in record && record.status ? record.status : "paid");
  const [costPerTrip, setCostPerTrip] = useState(record && "costPerTon" in record ? String(record.costPerTon || "") : "");
  const [manualAmount, setManualAmount] = useState(kind !== "expense" || choice !== "Husk");
  const [totalWeight] = useState(record && "totalWeight" in record ? String(record.totalWeight || "") : "");
  const [description, setDescription] = useState(record && "description" in record ? record.description : "");
  const [trips, setTrips] = useState(record && "trips" in record ? String(record.trips || record.loads || 1) : "1");
  const [showDate, setShowDate] = useState(false);
  const [error, setError] = useState("");
  const options = kind === "income" ? ["Coir Pith", "Coir Bale"] : ["Salaries", "Current bill", "Maintenance", "Husk"];
  const isHusk = kind === "expense" && choice === "Husk";
  const tripCount = Math.max(0, Number(trips) || 0);

  useEffect(() => {
    if (isHusk && !manualAmount) setAmount(((Number(costPerTrip) || 0) * tripCount).toFixed(2));
  }, [isHusk, manualAmount, costPerTrip, tripCount]);

  const save = () => {
    const value = Number(amount.replace(/,/g, ""));
    if (!amount || !Number.isFinite(value) || value <= 0) return setError("Amount must be greater than ₹0");
    const base = { id: record?.id || String(Date.now()), date: date.toISOString(), amount: value };
    onSave(kind === "income"
      ? { ...base, product: choice as Income["product"], name: name.trim(), address: address.trim(), status }
      : {
          ...base,
          category: choice as Expense["category"],
          repairAmount: 0,
          description: description.trim(),
          loads: isHusk ? tripCount : 0,
          trips: isHusk ? tripCount : 0,
          loadWeight: isHusk ? TONS_PER_TRIP : 0,
          coirOutput: isHusk ? tripCount * (TONS_PER_TRIP * 0.25) : 0,
          pithOutput: isHusk ? tripCount * (TONS_PER_TRIP * 0.75) : 0,
          costPerTon: Number(costPerTrip) || 0,
          totalWeight: isHusk ? tripCount * TONS_PER_TRIP : Number(totalWeight) || 0,
        });
  };

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalWrap}>
        <ScrollView style={s.sheet} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetContent}>
          <View style={s.sheetHandle} />
          <View style={s.formHead}>
            <Text style={s.formTitle}>{record ? "Edit" : "Add"} {kind}</Text>
            <Pressable testID="record-close-button" onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={C.ink} /></Pressable>
          </View>

          <View style={s.dateLabelRow}>
            <Text style={s.inputLabel}>DATE</Text>
            <Pressable testID="record-today-button" onPress={() => setDate(new Date())}><Text style={s.todayLink}>Use today</Text></Pressable>
          </View>
          <Pressable testID="record-date-input" style={s.inputRow} onPress={() => setShowDate(true)}>
            <MaterialCommunityIcons name="calendar-month-outline" size={21} color={C.forest} />
            <Text style={s.inputValue}>{displayDate(date.toISOString())}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={C.muted} />
          </Pressable>
          {showDate && <DateTimePicker value={date} mode="date" display="default" onChange={(_, selected) => { setShowDate(false); if (selected) setDate(selected); }} />}

          <Text style={s.inputLabel}>{kind === "income" ? "PRODUCT" : "CATEGORY"}</Text>
          <View testID="record-type-input" style={s.options}>
            {options.map((option) => (
              <Pressable key={option} testID={`record-type-${option.replace(/\s+/g, "-").toLowerCase()}`} onPress={() => { setChoice(option); setManualAmount(option !== "Husk"); }} style={[s.option, choice === option && s.optionSelected]}>
                <Text style={[s.optionText, choice === option && s.optionTextSelected]}>{option}</Text>
                {choice === option && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
              </Pressable>
            ))}
          </View>

          {kind === "income" ? (
            <>
              <Text style={s.inputLabel}>NAME</Text>
              <TextInput testID="record-name-input" value={name} onChangeText={setName} placeholder="Customer or buyer name" placeholderTextColor="#9DA49D" style={s.textInputBox} />
              <Text style={s.inputLabel}>ADDRESS</Text>
              <TextInput testID="record-address-input" value={address} onChangeText={setAddress} placeholder="Customer address" placeholderTextColor="#9DA49D" style={s.textInputBox} />
              <Text style={s.inputLabel}>PAYMENT STATUS</Text>
              <View style={s.options}>
                {(["paid", "pending"] as const).map((st) => (
                  <Pressable key={st} testID={`record-status-${st}`} onPress={() => setStatus(st)} style={[s.option, status === st && (st === "pending" ? s.optionSelectedWarn : s.optionSelected)]}>
                    <MaterialCommunityIcons name={st === "paid" ? "check-circle-outline" : "clock-outline"} size={16} color={status === st ? "#fff" : C.muted} />
                    <Text style={[s.optionText, status === st && s.optionTextSelected]}>{st === "paid" ? "Paid" : "Pending"}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={s.inputLabel}>{choice === "Maintenance" ? "DESCRIPTION" : "NAME"}</Text>
              <TextInput testID="record-description-input" value={description} onChangeText={setDescription} placeholder={choice === "Maintenance" ? "What was repaired?" : choice === "Husk" ? "Supplier / batch name" : choice === "Current bill" ? "Bill name / provider" : "Employee name"} placeholderTextColor="#9DA49D" style={s.textInputBox} />
              {isHusk && (
                <>
                  <Text style={s.inputLabel}>NUMBER OF TRIPS</Text>
                  <TextInput testID="husk-loads-input" value={trips} onChangeText={setTrips} keyboardType="decimal-pad" style={s.textInputBox} />
                  <Text style={s.inputLabel}>COST PER TRIP</Text>
                  <View style={s.amountInput}>
                    <Text style={s.rupee}>₹</Text>
                    <TextInput testID="expense-cost-per-trip-input" value={costPerTrip} onChangeText={setCostPerTrip} placeholder="0.00" placeholderTextColor="#9DA49D" keyboardType="decimal-pad" style={s.textInput} />
                  </View>
                </>
              )}
            </>
          )}

          <View style={s.amountModeRow}>
            <Text style={s.inputLabel}>{isHusk && !manualAmount ? "AMOUNT (AUTO)" : "AMOUNT"}</Text>
            {isHusk && (
              <Pressable testID="expense-manual-amount-toggle" onPress={() => setManualAmount(!manualAmount)}>
                <Text style={s.manualToggle}>{manualAmount ? "Use auto amount" : "Enter manually"}</Text>
              </Pressable>
            )}
          </View>
          <View style={[s.amountInput, error ? s.errorBorder : null]}>
            <Text style={s.rupee}>₹</Text>
            <TextInput testID="record-amount-input" value={amount} onChangeText={(text) => { setAmount(text); setManualAmount(true); setError(""); }} placeholder="0.00" placeholderTextColor="#9DA49D" keyboardType="decimal-pad" style={s.textInput} />
          </View>

          {isHusk && (
            <View testID="husk-production-summary" style={s.productionBox}>
              <Text style={s.productionTitle}>HUSK PROCESSING OUTPUT</Text>
              <Text style={s.productionText}>{trips || "0"} trip{tripCount === 1 ? "" : "s"} ≈ <Text style={s.productionStrong}>{tripCount * TONS_PER_TRIP} tons</Text> processed</Text>
              <View style={s.outputRow}>
                <Text style={s.outputText}>Coir output</Text>
                <Text style={s.outputValue}>{(tripCount * TONS_PER_TRIP * 0.25).toFixed(2)} tons</Text>
                <Text style={s.outputText}>Pith output</Text>
                <Text style={s.outputValue}>{(tripCount * TONS_PER_TRIP * 0.75).toFixed(2)} tons</Text>
              </View>
            </View>
          )}

          {error ? <Text testID="record-error" style={s.error}>{error}</Text> : null}

          <View style={s.formButtons}>
            <Pressable testID="record-cancel-button" onPress={onClose} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></Pressable>
            <Pressable testID="record-save-button" onPress={save} style={s.save}><Text style={s.saveText}>Save {kind}</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CalendarView({ incomes, expenses }: { incomes: Income[]; expenses: Expense[] }) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(month);
  const inMonth = (r: { date: string }) => { const d = new Date(r.date); return d.getFullYear() === year && d.getMonth() === monthIndex; };
  const monthIncomes = incomes.filter(inMonth);
  const monthExpenses = expenses.filter(inMonth);
  const monthIncome = monthIncomes.reduce((sum, r) => sum + r.amount, 0);
  const monthExpense = monthExpenses.reduce((sum, r) => sum + r.amount + (r.repairAmount || 0), 0);

  const rows = Array.from({ length: days }, (_, i) => {
    const date = new Date(year, monthIndex, i + 1);
    const key = date.toISOString().slice(0, 10);
    const income = incomes.filter((r) => r.date.slice(0, 10) === key).reduce((sum, r) => sum + r.amount, 0);
    const expense = expenses.filter((r) => r.date.slice(0, 10) === key).reduce((sum, r) => sum + r.amount + (r.repairAmount || 0), 0);
    return { date, key, income, expense };
  }).filter((row) => row.income || row.expense);

  const dayIncomes = selected ? incomes.filter((r) => r.date.slice(0, 10) === selected) : [];
  const dayExpenses = selected ? expenses.filter((r) => r.date.slice(0, 10) === selected) : [];

  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const html = buildMonthHTML(monthName, monthIncomes, monthExpenses, monthIncome, monthExpense);
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Coir Ledger — ${monthName}`, UTI: "com.adobe.pdf" });
      }
    } catch {
      // silently ignore cancel / unsupported
    } finally {
      setExporting(false);
    }
  };

  return (
    <View testID="monthly-calendar">
      <View style={s.calendarHead}>
        <Pressable testID="calendar-previous-month" onPress={() => setMonth(new Date(year, monthIndex - 1, 1))}><MaterialCommunityIcons name="chevron-left" size={25} color={C.forest} /></Pressable>
        <Text style={s.calendarTitle}>{monthName}</Text>
        <Pressable testID="calendar-next-month" onPress={() => setMonth(new Date(year, monthIndex + 1, 1))}><MaterialCommunityIcons name="chevron-right" size={25} color={C.forest} /></Pressable>
      </View>
      <View testID="calendar-month-summary" style={s.calendarSummary}>
        <View><Text style={s.panelLabel}>INCOME</Text><Text style={s.calendarIncome}>{money(monthIncome)}</Text></View>
        <View><Text style={s.panelLabel}>EXPENSES</Text><Text style={s.calendarExpense}>{money(monthExpense)}</Text></View>
        <View><Text style={s.panelLabel}>NET</Text><Text style={[s.calendarNet, { color: monthIncome - monthExpense >= 0 ? C.income : C.expense }]}>{money(monthIncome - monthExpense)}</Text></View>
      </View>

      <Pressable testID="export-month-button" onPress={exportPdf} disabled={exporting || rows.length === 0} style={[s.exportButton, (exporting || rows.length === 0) && s.exportDisabled]}>
        <MaterialCommunityIcons name="file-pdf-box" size={19} color="#fff" />
        <Text style={s.exportText}>{exporting ? "Preparing…" : `Export ${monthName} as PDF`}</Text>
      </Pressable>

      <View style={s.calendarLegend}>
        <Text style={s.legendIncome}>● Income</Text>
        <Text style={s.legendExpense}>● Expenses</Text>
        <Text style={s.legendHint}>Tap a day for details</Text>
      </View>

      {rows.length === 0 ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={30} color={C.action} />
          <Text style={s.emptyTitle}>No activity this month</Text>
          <Text style={s.emptyCopy}>Income and expenses will appear here by day.</Text>
        </View>
      ) : rows.map((row) => (
        <Pressable key={row.key} testID="calendar-day-row" onPress={() => setSelected(row.key)} style={s.dayRow}>
          <View style={s.dayDate}><Text style={s.dayNumber}>{row.date.getDate()}</Text><Text style={s.dayName}>{new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(row.date)}</Text></View>
          <View style={s.dayValues}>
            {row.income ? <Text style={s.dayIncome}>+ {money(row.income)}</Text> : <Text style={s.dayMuted}>—</Text>}
            {row.expense ? <Text style={s.dayExpense}>− {money(row.expense)}</Text> : <Text style={s.dayMuted}>—</Text>}
          </View>
          <Text style={[s.dayNet, { color: row.income - row.expense >= 0 ? C.income : C.expense }]}>{money(row.income - row.expense)}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={C.line} />
        </Pressable>
      ))}

      {selected && <DayDetailModal dateKey={selected} incomes={dayIncomes} expenses={dayExpenses} onClose={() => setSelected(null)} />}
    </View>
  );
}

function DayDetailModal({ dateKey, incomes, expenses, onClose }: { dateKey: string; incomes: Income[]; expenses: Expense[]; onClose: () => void }) {
  const dayIncome = incomes.reduce((sum, r) => sum + r.amount, 0);
  const dayExpense = expenses.reduce((sum, r) => sum + r.amount + (r.repairAmount || 0), 0);
  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={s.modalWrap}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={[s.formHead, s.detailHeaderPad]}>
            <View>
              <Text style={s.detailOverline}>DAY DETAILS</Text>
              <Text style={s.formTitle}>{displayDate(dateKey)}</Text>
            </View>
            <Pressable testID="day-detail-close" onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={C.ink} /></Pressable>
          </View>
          <ScrollView testID="day-detail-modal" style={s.detailScroll} showsVerticalScrollIndicator={false}>
            <View style={s.detailSummary}>
              <View><Text style={s.panelLabel}>INCOME</Text><Text style={[s.smallAmount, { color: C.income }]}>{money(dayIncome)}</Text></View>
              <View><Text style={s.panelLabel}>EXPENSES</Text><Text style={[s.smallAmount, { color: C.expense }]}>{money(dayExpense)}</Text></View>
              <View><Text style={s.panelLabel}>NET</Text><Text style={[s.smallAmount, { color: dayIncome - dayExpense >= 0 ? C.income : C.expense }]}>{money(dayIncome - dayExpense)}</Text></View>
            </View>

            <Text style={s.detailSectionLabel}>INCOME</Text>
            {incomes.length === 0 ? <Text style={s.detailEmpty}>No income on this day.</Text> : incomes.map((r) => (
              <View key={r.id} testID="day-detail-income-row" style={s.detailRow}>
                <View style={s.detailRowMain}>
                  <Text style={s.detailRowTitle}>{r.product}{r.name ? ` · ${r.name}` : ""}</Text>
                  <Text style={[s.detailStatus, { color: isPending(r) ? C.action : C.income }]}>{isPending(r) ? "Pending" : "Paid"}</Text>
                </View>
                <Text style={[s.detailAmount, { color: C.income }]}>+ {money(r.amount)}</Text>
              </View>
            ))}

            <Text style={s.detailSectionLabel}>EXPENSES</Text>
            {expenses.length === 0 ? <Text style={s.detailEmpty}>No expenses on this day.</Text> : expenses.map((r) => (
              <View key={r.id} testID="day-detail-expense-row" style={s.detailRow}>
                <View style={s.detailRowMain}>
                  <Text style={s.detailRowTitle}>{describeRow(r)}</Text>
                </View>
                <Text style={[s.detailAmount, { color: C.expense }]}>− {money(r.amount + (r.repairAmount || 0))}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Settings({ onClear }: { onClear: () => void }) {
  return (
    <View style={s.settings}>
      <View style={s.settingRow}>
        <MaterialCommunityIcons name="cellphone-lock" size={22} color={C.forest} />
        <View style={s.settingCopy}><Text style={s.settingTitle}>Private by default</Text><Text style={s.settingSub}>Your records are stored only on this device.</Text></View>
      </View>
      <View style={s.settingRow}>
        <MaterialCommunityIcons name="cash" size={22} color={C.forest} />
        <View style={s.settingCopy}><Text style={s.settingTitle}>Currency</Text><Text style={s.settingSub}>Indian Rupee (₹ INR)</Text></View>
      </View>
      <View style={s.settingRow}>
        <MaterialCommunityIcons name="file-pdf-box" size={22} color={C.forest} />
        <View style={s.settingCopy}><Text style={s.settingTitle}>Export</Text><Text style={s.settingSub}>Open the Calendar tab to export any month as a PDF.</Text></View>
      </View>
      <Pressable testID="clear-all-records-button" style={s.clearButton} onPress={onClear}>
        <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={C.expense} />
        <Text style={s.clearText}>Clear all records</Text>
      </Pressable>
    </View>
  );
}

const escapeHtml = (v: unknown) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

function buildMonthHTML(monthName: string, incs: Income[], exps: Expense[], totIn: number, totEx: number) {
  const incRows = incs.length
    ? incs.map((r) => `<tr><td>${displayDate(r.date)}</td><td>${escapeHtml(r.product)}</td><td>${escapeHtml(r.name)}</td><td>${isPending(r) ? "Pending" : "Paid"}</td><td class="amt">${escapeHtml(money(r.amount))}</td></tr>`).join("")
    : `<tr><td colspan="5" class="empty">No income recorded</td></tr>`;
  const expRows = exps.length
    ? exps.map((r) => `<tr><td>${displayDate(r.date)}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.description || (r.category === "Husk" && r.trips ? `${r.trips} trips @ ₹${r.costPerTon}/trip` : ""))}</td><td class="amt">${escapeHtml(money(r.amount + (r.repairAmount || 0)))}</td></tr>`).join("")
    : `<tr><td colspan="4" class="empty">No expenses recorded</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1F2924; padding: 28px; }
    h1 { font-size: 22px; margin: 0; }
    .sub { color: #59635C; font-size: 12px; margin: 4px 0 20px; }
    .cards { display: flex; gap: 12px; margin-bottom: 22px; }
    .card { flex: 1; border: 1px solid #D8D1C4; border-radius: 8px; padding: 12px 14px; }
    .card .k { font-size: 10px; letter-spacing: 1px; color: #59635C; text-transform: uppercase; }
    .card .v { font-size: 18px; font-weight: 700; margin-top: 6px; }
    .inc { color: #2F7D57; } .exp { color: #B65A43; }
    h2 { font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: #C76B35; margin: 22px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E6DFD2; }
    th { background: #F0E9DC; font-size: 10px; letter-spacing: 0.6px; text-transform: uppercase; color: #59635C; }
    td.amt, th.amt { text-align: right; font-variant-numeric: tabular-nums; }
    td.empty { text-align: center; color: #9DA49D; font-style: italic; }
    tfoot td { font-weight: 700; border-top: 2px solid #1F2924; }
    .foot { margin-top: 26px; font-size: 10px; color: #9DA49D; }
  </style></head><body>
    <h1>Coir Ledger</h1>
    <div class="sub">${escapeHtml(monthName)} · Generated ${escapeHtml(displayDate(new Date().toISOString()))}</div>
    <div class="cards">
      <div class="card"><div class="k">Total Income</div><div class="v inc">${escapeHtml(money(totIn))}</div></div>
      <div class="card"><div class="k">Total Expenses</div><div class="v exp">${escapeHtml(money(totEx))}</div></div>
      <div class="card"><div class="k">Net Balance</div><div class="v" style="color:${totIn - totEx >= 0 ? "#2F7D57" : "#B65A43"}">${escapeHtml(money(totIn - totEx))}</div></div>
    </div>
    <h2>Income</h2>
    <table><thead><tr><th>Date</th><th>Product</th><th>Name</th><th>Status</th><th class="amt">Amount</th></tr></thead>
    <tbody>${incRows}</tbody>
    <tfoot><tr><td colspan="4">Total income</td><td class="amt">${escapeHtml(money(totIn))}</td></tr></tfoot></table>
    <h2>Expenses</h2>
    <table><thead><tr><th>Date</th><th>Category</th><th>Details</th><th class="amt">Amount</th></tr></thead>
    <tbody>${expRows}</tbody>
    <tfoot><tr><td colspan="3">Total expenses</td><td class="amt">${escapeHtml(money(totEx))}</td></tr></tfoot></table>
    <div class="foot">Stored on device · Coir Ledger</div>
  </body></html>`;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  header: { height: 70, paddingHorizontal: 20, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontFamily: Platform.select({ ios: "Georgia", default: "serif" }), fontSize: 24, fontWeight: "700", color: C.ink },
  localRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  local: { color: C.muted, fontSize: 12 },
  dot: { width: 7, height: 7, backgroundColor: C.income, borderRadius: 4, marginRight: 4 },
  content: { padding: 20, paddingBottom: 150 },
  overline: { color: C.action, fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 15 },
  greeting: { fontFamily: Platform.select({ ios: "Georgia", default: "serif" }), fontSize: 29, fontWeight: "700", color: C.ink },
  dateContext: { color: C.muted, fontSize: 14, marginTop: 6, marginBottom: 22 },
  summary: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, flexDirection: "row", marginBottom: 16 },
  netPanel: { backgroundColor: C.forest, padding: 18, flex: 1.1, minHeight: 140 },
  panelLabel: { color: C.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  panelLabelDark: { color: "#C7D5CA", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  netAmount: { color: C.surface, fontFamily: Platform.select({ ios: "Courier New", default: "monospace" }), fontSize: 25, fontWeight: "700", marginTop: 18 },
  netNote: { color: "#C7D5CA", fontSize: 11, marginTop: 10, lineHeight: 16 },
  smallTotals: { flex: 0.9, padding: 18, justifyContent: "center", gap: 15 },
  smallAmount: { fontFamily: Platform.select({ ios: "Courier New", default: "monospace" }), fontSize: 16, fontWeight: "700", marginTop: 5 },
  divider: { height: 1, backgroundColor: C.line },
  outstandingPill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F7EAD8", borderWidth: 1, borderColor: "#E6C89A", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 18 },
  outstandingText: { flex: 1, color: C.ink, fontSize: 13 },
  outstandingStrong: { fontWeight: "800", color: C.action },
  tabs: { backgroundColor: "#E9E2D7", padding: 4, flexDirection: "row", borderRadius: 22, marginBottom: 16 },
  tab: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 19 },
  selectedTab: { backgroundColor: C.forest },
  tabText: { color: C.muted, fontSize: 13, fontWeight: "700" },
  selectedTabText: { color: C.surface },
  filtersWrap: { marginBottom: 18, gap: 10 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, minHeight: 48 },
  searchInput: { flex: 1, color: C.ink, fontSize: 15, paddingVertical: 10 },
  dateRangeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 42, paddingHorizontal: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10 },
  dateChipText: { color: C.ink, fontSize: 13, fontWeight: "700" },
  dateChipPlaceholder: { color: "#9DA49D", fontWeight: "600" },
  dateClear: { minHeight: 42, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  dateClearText: { color: C.expense, fontSize: 12, fontWeight: "800" },
  section: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, marginBottom: 20 },
  sectionHead: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionOverline: { color: C.action, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  sectionTitle: { color: C.ink, fontFamily: Platform.select({ ios: "Georgia", default: "serif" }), fontSize: 21, fontWeight: "700", marginTop: 3 },
  addLink: { minHeight: 44, paddingHorizontal: 10, flexDirection: "row", gap: 4, alignItems: "center" },
  addLinkText: { color: C.forest, fontWeight: "800" },
  filterRow: { maxHeight: 56, borderTopWidth: 1, borderTopColor: C.line },
  filterRowContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: "center" },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  chipSelected: { backgroundColor: C.forest, borderColor: C.forest },
  chipText: { color: C.muted, fontSize: 12, fontWeight: "700" },
  chipTextSelected: { color: "#fff" },
  tableHeader: { flexDirection: "row", padding: 11, backgroundColor: "#F0E9DC", borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line },
  cell: { flex: 1, color: C.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  dateCell: { width: 78, flex: 0 },
  amountCell: { textAlign: "right", width: 100, flex: 0 },
  actionCell: { width: 65 },
  row: { minHeight: 62, paddingHorizontal: 11, paddingVertical: 8, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.line },
  rowText: { color: C.ink, fontSize: 12 },
  rowActions: { width: 65, flexDirection: "row", justifyContent: "space-between", paddingLeft: 10 },
  badge: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start", marginTop: 6, minHeight: 24, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgePending: { backgroundColor: "#F7EAD8", borderColor: "#E6C89A" },
  badgePaid: { backgroundColor: "#E4F0E8", borderColor: "#B9D8C4" },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  empty: { padding: 25, alignItems: "center" },
  emptyTitle: { color: C.ink, fontWeight: "800", marginTop: 10 },
  emptyCopy: { color: C.muted, fontSize: 13, textAlign: "center", marginTop: 5 },
  fabRow: { position: "absolute", bottom: 78, right: 16, flexDirection: "row", gap: 8 },
  fab: { minHeight: 44, paddingHorizontal: 14, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 5, elevation: 3 },
  fabText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  nav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 72, paddingBottom: Platform.OS === "ios" ? 12 : 4, backgroundColor: C.nav, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  navItem: { minWidth: 65, minHeight: 50, alignItems: "center", justifyContent: "center" },
  navText: { color: "#B8C1B9", fontSize: 10, marginTop: 3, fontWeight: "700" },
  modalWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(23,60,44,.35)" },
  sheet: { backgroundColor: C.surface, maxHeight: "88%", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetContent: { padding: 20, paddingBottom: Platform.OS === "ios" ? 40 : 28 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: C.line, alignSelf: "center", marginTop: 12, marginBottom: 14 },
  formHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  formTitle: { color: C.ink, fontFamily: Platform.select({ ios: "Georgia", default: "serif" }), fontSize: 26, fontWeight: "700", textTransform: "capitalize" },
  dateLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  todayLink: { color: C.forest, fontSize: 12, fontWeight: "800", marginTop: 10 },
  inputLabel: { color: C.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8, marginTop: 10 },
  inputRow: { minHeight: 50, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  inputValue: { flex: 1, color: C.ink, fontSize: 15 },
  textInputBox: { minHeight: 48, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, color: C.ink, fontSize: 15 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 44, borderWidth: 1, borderColor: C.line, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 6 },
  optionSelected: { backgroundColor: C.forest, borderColor: C.forest },
  optionSelectedWarn: { backgroundColor: C.action, borderColor: C.action },
  optionText: { color: C.ink, fontSize: 13, fontWeight: "700" },
  optionTextSelected: { color: "#fff" },
  amountModeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  manualToggle: { color: C.forest, fontSize: 12, fontWeight: "800", marginTop: 10 },
  amountInput: { minHeight: 52, borderWidth: 1, borderColor: C.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  errorBorder: { borderColor: C.expense },
  rupee: { color: C.forest, fontSize: 20, fontWeight: "700", marginRight: 8 },
  textInput: { flex: 1, color: C.ink, fontFamily: Platform.select({ ios: "Courier New", default: "monospace" }), fontSize: 18 },
  error: { color: C.expense, fontSize: 12, marginTop: 5 },
  formButtons: { flexDirection: "row", gap: 10, marginTop: 25 },
  cancel: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  cancelText: { color: C.ink, fontWeight: "800" },
  save: { flex: 1.4, minHeight: 50, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontWeight: "800" },
  productionBox: { marginTop: 14, padding: 12, backgroundColor: "#F0E9DC", borderWidth: 1, borderColor: C.line },
  productionTitle: { color: C.action, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  productionText: { color: C.muted, fontSize: 12, marginTop: 7 },
  productionStrong: { color: C.ink, fontWeight: "800" },
  outputRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  outputText: { color: C.muted, fontSize: 11 },
  outputValue: { color: C.forest, fontSize: 12, fontWeight: "800" },
  calendarHead: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarTitle: { color: C.ink, fontFamily: Platform.select({ ios: "Georgia", default: "serif" }), fontSize: 20, fontWeight: "700" },
  calendarSummary: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderTopWidth: 0, padding: 14, flexDirection: "row", justifyContent: "space-between" },
  exportButton: { marginTop: 14, minHeight: 50, borderRadius: 10, backgroundColor: C.forest, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  exportDisabled: { opacity: 0.5 },
  exportText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  calendarLegend: { flexDirection: "row", gap: 18, alignItems: "center", paddingVertical: 14 },
  legendIncome: { color: C.income, fontSize: 12, fontWeight: "700" },
  legendExpense: { color: C.expense, fontSize: 12, fontWeight: "700" },
  legendHint: { color: C.muted, fontSize: 11, marginLeft: "auto", fontStyle: "italic" },
  dayRow: { backgroundColor: C.surface, minHeight: 68, borderWidth: 1, borderColor: C.line, borderBottomWidth: 0, padding: 12, flexDirection: "row", alignItems: "center", gap: 4 },
  dayDate: { width: 52 },
  dayNumber: { color: C.ink, fontSize: 20, fontWeight: "800" },
  dayName: { color: C.muted, fontSize: 11, marginTop: 2 },
  dayValues: { flex: 1, gap: 5 },
  dayIncome: { color: C.income, fontFamily: Platform.select({ ios: "Courier New", default: "monospace" }), fontSize: 12 },
  dayExpense: { color: C.expense, fontFamily: Platform.select({ ios: "Courier New", default: "monospace" }), fontSize: 12 },
  dayMuted: { color: C.line, fontSize: 12 },
  dayNet: { width: 86, textAlign: "right", fontFamily: Platform.select({ ios: "Courier New", default: "monospace" }), fontSize: 12, fontWeight: "800" },
  detailOverline: { color: C.action, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 4 },
  detailHeaderPad: { paddingHorizontal: 20, marginTop: 4 },
  detailScroll: { paddingHorizontal: 20 },
  detailSummary: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F0E9DC", borderRadius: 10, padding: 14, marginBottom: 8 },
  detailSectionLabel: { color: C.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginTop: 18, marginBottom: 8 },
  detailEmpty: { color: C.muted, fontSize: 13, fontStyle: "italic" },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line, gap: 10 },
  detailRowMain: { flex: 1 },
  detailRowTitle: { color: C.ink, fontSize: 14, fontWeight: "600" },
  detailStatus: { fontSize: 11, fontWeight: "800", marginTop: 3 },
  detailAmount: { fontFamily: Platform.select({ ios: "Courier New", default: "monospace" }), fontSize: 14, fontWeight: "800" },
  settings: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  settingRow: { padding: 18, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: "row", gap: 14, alignItems: "center" },
  settingCopy: { flex: 1 },
  settingTitle: { color: C.ink, fontSize: 15, fontWeight: "800" },
  settingSub: { color: C.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  clearButton: { minHeight: 56, paddingHorizontal: 18, flexDirection: "row", gap: 10, alignItems: "center" },
  clearText: { color: C.expense, fontWeight: "800" },
  confirmWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, backgroundColor: "rgba(23,60,44,.45)" },
  confirmCard: { width: "100%", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 22 },
  confirmTitle: { color: C.ink, fontFamily: Platform.select({ ios: "Georgia", default: "serif" }), fontSize: 20, fontWeight: "700" },
  confirmMessage: { color: C.muted, fontSize: 14, marginTop: 8, lineHeight: 20 },
  confirmButtons: { flexDirection: "row", gap: 10, marginTop: 22 },
  confirmDanger: { flex: 1.4, minHeight: 50, backgroundColor: C.expense, alignItems: "center", justifyContent: "center", borderRadius: 8 },
});
