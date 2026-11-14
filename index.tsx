console.log(" [DEBUG] JS Bundle Loaded - index.ts executing");
import { registerRootComponent } from 'expo';
import { NativeModules, Platform } from "react-native";
import App from './App';

if (Platform.OS === "ios") {
  console.log(
    "[widget] NativeModules has HabitWidgetController?",
    Object.prototype.hasOwnProperty.call(NativeModules, "HabitWidgetController"),
    NativeModules.HabitWidgetController
  );
}

// function TestApp() {
//   return (
//     <View style={{ flex: 1, backgroundColor: 'blue', alignItems: 'center', justifyContent: 'center' }}>
//       <Text style={{ fontSize: 40, color: 'white' }}>DEBUG MODE</Text>
//     </View>
//   );
// }

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
function Root() {
  return <App />;
}

registerRootComponent(Root);
