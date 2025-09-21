import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import CameraScreen from "./CameraScreen";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { BottomNavigation } from "react-native-paper";
import { useState } from 'react';
import AnimatedIcon from '../component/AnimatedIcon';
import MapScreen from "./MapScreen";


export default function App() {
  const layout = Dimensions.get("window");

  const [index, setIndex] = useState(2); 
  const [routes] = useState([
  { key: "analytics", title: "Analytics", icon: "analytics", barColor: "#ff6666" },
  { key: "maps", title: "HeatMap", icon: "location", barColor: "#66ff66" },
  { key: "home", title: "Home", icon: "add-circle", barColor: "#66ccff" },
  { key: "reports", title: "Reports", icon: "file-document-outline", barColor: "#66ccff" },
  { key: "profile", title: "Profile", icon: "person", barColor: "#ffcc66" },
  ]);


  const Home = () => <CameraScreen setIndex={setIndex}/>;
  const Profile = () => <View style={styles.screen}><Text>Profile</Text></View>;
  const Analytics = () => <View style={styles.screen}><Text>Analytics</Text></View>;
  const Maps = () => <View style={{flex:1}}><MapScreen index={index}/></View>;
  const Reports = () => <View style={styles.screen}><Text>Reports</Text></View>;
  const renderScene = SceneMap({
    analytics:Analytics,
    maps:Maps,
    profile:Profile,
    home: Home,
    reports:Reports
  });


  return (
      <SafeAreaProvider >
      {/* <Ionicons name="add-circle-outline" */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={() => null}
        swipeEnabled={routes[index].key != "home" && routes[index].key != 'maps'}
      />
      <LinearGradient 
      colors={["#b0edff6a", "#2baaff90", "#000000c8"]}
          start={{ x: 5, y: 0 }}>

        <BottomNavigation.Bar
          navigationState={{ index, routes }}
          onTabPress={({ route }) => {
            setIndex(routes.indexOf(route)); 
          }}
          activeIndicatorStyle={{
            backgroundColor: "transparent",
          }}

          renderIcon={({ route, focused, color }) => (
            <AnimatedIcon route={route} focused={focused} color={color}/>
          )}
          renderLabel={({ route, focused, color }) => {
            if (route.key === "home") return null; // hide only for home
            return (
              <Text
                style={{
                  fontSize: 11,
                  color,
                  textAlign: "center",
                  marginTop: 0,
                }}
              >
                {route.title}
              </Text>
            );
          }}
          activeColor="lightblue"
          inactiveColor="white"            
          style={{
            backgroundColor: "#112f4e",  
            height: 100,                
            borderTopLeftRadius: 15,    
            borderTopRightRadius: 15,
            elevation: 5  ,                
            shadowColor: "#000000ff",        
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }}
        />
      </LinearGradient>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1,  justifyContent:'center', alignItems:"center"},
});
