import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import { useAuth } from "../lib/authContext";
import { colors } from "../lib/theme";
import { LoginScreen } from "../screens/LoginScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { InvoicesScreen } from "../screens/InvoicesScreen";
import { InvoiceDetailScreen } from "../screens/InvoiceDetailScreen";
import { NewInvoiceScreen } from "../screens/NewInvoiceScreen";
import { CustomersScreen } from "../screens/CustomersScreen";
import { ItemsScreen } from "../screens/ItemsScreen";
import { ReportsScreen } from "../screens/ReportsScreen";

// InvoiceDetail/NewInvoice live on the root stack (not nested inside the
// Invoices tab) so Dashboard can navigate straight to an invoice too -
// React Navigation bubbles `navigate()` up to find them there.
export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  InvoiceDetail: { id: string };
  NewInvoice: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  InvoicesList: undefined;
  Customers: undefined;
  Items: undefined;
  Reports: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTintColor: colors.ink,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkLight,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="InvoicesList" component={InvoicesScreen} options={{ title: "Invoices" }} />
      <Tab.Screen name="Customers" component={CustomersScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Items" component={ItemsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <Text style={{ color: colors.inkLight }}>Loading…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerTintColor: colors.ink }}>
        {!token ? (
          <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <RootStack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <RootStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: "Invoice" }} />
            <RootStack.Screen
              name="NewInvoice"
              component={NewInvoiceScreen}
              options={{ title: "New invoice", presentation: "modal" }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
