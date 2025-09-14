import { Animated, Easing, Text, View } from "react-native";
import { useEffect, useRef } from "react";
import { MaterialCommunityIcons, MaterialIcons, Octicons } from "@expo/vector-icons";

export default function AnimatedIcon({ route, focused, color }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: focused ? (route.key === 'home' ? -6 : -12) : 0,
      useNativeDriver: true,
      tension: 20,   // lower = slower
      friction: 10,  // higher = smoother stop
    }).start();
  }, [focused]);

  const renderIcon = (route) => {
    switch(route.key) {
      case 'analytics':
        return <MaterialIcons name={route.icon} size={focused ? 30 : 24} color={focused ? "lightblue":"lightgrey"} style={{}} />
      case 'maps':
      case 'profile':
        return <Octicons name={route.icon} size={focused ? 30 : 24} color={focused ? "lightblue":"lightgrey"} style={{}} />
      case 'reports':
        return <MaterialCommunityIcons name={route.icon} size={focused ? 30 : 24} color={focused ? "lightblue":"lightgrey"} style={{}} />
      case 'home' :
        return <MaterialCommunityIcons name="plus-circle-outline" size={focused ? 55 : 50} color={focused ? "lightblue":"lightgrey"} style={{}} />
    }
  }
  return (
    <Animated.View style={{ transform: [{ translateY }] , position:"relative"}}>
        <View
          style={{
            backgroundColor: focused
              ? "rgba(255,255,255,0.2)"
              : "rgba(255,255,255,0.009)",
            width: route.key === "home" ? 80 : 50,
            height: route.key === "home" ? 60 : 40,
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 20,
            
            top:route.key === 'home' && -8


          }}
        >
          
          {renderIcon(route)}
          
        </View>

    </Animated.View>
  );
}