import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ScrollView, TextInput, Modal, TouchableOpacity, Image } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CustomDropdown from '../component/maps/CustomDropdown';
import * as Location from "expo-location"
import { getAllReports, getReportData } from '../services/mapServices';
import { getDistanceMeters } from '../helpers/MapHelper';
import AnimatedButton from '../component/maps/AnimatedButton';
export default function MapScreen( {index}) {
  const [htmlContent, setHtmlContent] = useState(null);
  const webviewRef = useRef(null);
  const [userLoc, setUserLoc] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [allMarkers, setAllMarkers] = useState([]);
  const [selectedReportData, setSelectedReportData] = useState(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const mapItems = [
    { color: "blue", label: "Potholes" },
    { color: "red", label: "Emergency" },
    { color: "green", label: "Garbage" },
    { color: "purple", label: "Other" },
  ];
  const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Location permission is required");
        return null;
      }
      let loc = await Location.getCurrentPositionAsync({}); 
      setUserLoc({
        "lat": loc.coords.latitude, 
        "lng":loc.coords.longitude, 
        "color":  "rgb(50,150,255)",
        "isUser":true
      })
    };
  const loadHtml = async () => {
    const asset = Asset.fromModule(require('../assets/leaflet.html'));
    await asset.downloadAsync();
    const content = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    setHtmlContent(content);
  };
  useEffect(() => {
    getLocation();
    if (index === 1) {

      const getReports = async () => {
        const response = await getAllReports();
        setAllMarkers(response)
        setMarkers(userLoc ? [userLoc, ...response.filter(r => r.status !== "Invalid Report")]: [...response])
        loadHtml();
      }
      getReports();
    }
  }, []);
  
  // Inject markers directly via JS
  useEffect(() => {
    if (userLoc) {
      setMarkers(prev =>[...prev, userLoc])
    }
  }, [userLoc])
  useEffect(() => {
    if (webviewRef.current && markers) {
      webviewRef.current.postMessage(
        JSON.stringify({ type: "loadMarkers", markers })
      );
      
    }
  }, [markers]);
  
  const handleMessage = async (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === "markerClick") {
      const reportData = await getReportData(data.Rid);
      if (userLoc) {
        reportData.canResolve = getDistanceMeters(userLoc.lat, userLoc.lng, data.lat, data.lng) < 575

      }
      setSelectedReportData({...reportData, color: data.color});

      setShowResolutionModal(true);
    }
  };
  if (!htmlContent) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  return (
    <View style={styles.container}>
        <WebView 
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          // injectedJavaScript={injectedJS}
          style={{ flex: 1, marginTop: 10 }}
          onMessage={handleMessage}
          onLoadEnd={() => {
            // when the HTML is ready, push the markers
            if (markers) {
              webviewRef.current.postMessage(
                JSON.stringify({ type: "loadMarkers", markers })
              );
            }
          }}
        />
      {!userLoc && 
      <View style={{position:"absolute", paddingHorizontal:15, paddingVertical:4, top:175, backgroundColor:"#11304ed4", alignSelf:"center", disply:"flex", flexDirection:"row", gap:12, borderRadius:30}}>
        <ActivityIndicator />
        <Text style={{color:"white"}}>Fetching location</Text>
      </View>
      }

      {/* Search bar */}
      <View style={{
        position: "absolute", width: "73%", left: 50, borderRadius: 25, height: 50, top: 60,
        backgroundColor: "white", borderColor: "black", borderWidth: 1, paddingLeft: 10,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between"
      }}>
        <TextInput placeholder='Search location' placeholderTextColor={"rgba(83, 83, 83, 1)"} />
        <View style={{ backgroundColor: "#112f4e", borderRadius: 45, padding: 10, borderWidth: 1 }}>
          <Ionicons name="search" size={28} color="white" />
        </View>
      </View>

      {/* <View
      pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 118,
          alignSelf: "center",
          flexDirection: "row",
          borderRadius: 25,
          borderWidth: 2,
          borderColor: "black",
          overflow: "hidden",
          zIndex:9999
        }}
      >
        <TouchableOpacity
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: mapType === "marker" ? "#112f4e" : "transparent",
            borderRightWidth: 1,
            borderRightColor: "black",
          }}
          onPress={() => setMapType("marker")}
        >
          <Ionicons name="map-outline" size={24} color= {mapType === "marker" && "white"} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: mapType === "heat" ? "#112f4e" : "transparent",
            borderLeftWidth: 1,
            borderLeftColor: "black",
          }}
          onPress={() => setMapType("heat")}
        >
          <MaterialCommunityIcons name="heat-wave" size={24} color= {mapType === "heat" && "white"}  />
        </TouchableOpacity>
      </View> */}

      <TouchableOpacity style={{position:"absolute", bottom:70, right:10, backgroundColor:"white", padding:8, borderRadius:50, borderWidth:1, borderColor:"black"}}
      onPress={() => {
        if (webviewRef.current && userLoc) {
          webviewRef.current.postMessage(
            JSON.stringify({ type: "setView", markers })
          );
          
        }
      }}
      >
        <MaterialCommunityIcons name="target" size={40} />
      </TouchableOpacity>
      {/* Settings button */}
      <TouchableOpacity style={{
        position: "absolute", alignSelf: "center", borderRadius: 10, height: 50,
        right: 10, top: 60, backgroundColor: "white", borderColor: "black", borderWidth: 1,
        paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between"
      }}>
        <Ionicons name="settings" size={30} />
      </TouchableOpacity>

      {/* Dropdown */}
      <ScrollView horizontal style={{ position: "absolute", top: 115, height: 50, width: "75%", overflow: "scroll", alignSelf: "center" }}>
        <CustomDropdown setMarkers={setMarkers} userLoc={userLoc} markers={allMarkers}/>
      </ScrollView>

      {/* Legend */}
      {/* <View style={{
        backgroundColor: "rgba(255, 255, 255, 0.6)", width: "30%", height: "15%",
        position: "absolute", bottom: 0, right: 10, borderColor: "black", borderWidth: 1,
        borderRadius: 10, paddingTop: 10
      }}>
        {mapItems.map((m, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingLeft: 7, paddingTop: 2, gap: 5 }}>
            <MaterialCommunityIcons name="circle" size={20} color={m.color} />
            <Text style={{ fontSize: 15 }}>{m.label}</Text>
          </View>
        ))}
      </View> */}
      {showResolutionModal && selectedReportData &&
        <Modal
            animationType="slide"
            transparent
            visible={showResolutionModal}
            onRequestClose={() => setShowResolutionModal(false)}
          >
            <View style={styles.overlay}>
              <View style={styles.modal}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 11 }}>
                    {selectedReportData.createdAt.split(",")[1]} {/* Time */}
                  </Text>
                  <Text style={{ fontSize: 11 }}>
                    {selectedReportData.createdAt.split(",")[0]} {/* Date */}
                  </Text>
                </View>
                <View style={{position:"absolute", top:"2%", 
                  // backgroundColor:selectedReportData.status.includes("Invalid") ? 
                  // "rgba(146, 0, 0, 1)" : 
                  // selectedReportData.status.includes("Progress") ? 
                  // "rgba(160, 150, 0, 1)"
                  // :
                  // "#112f4e", 
                  backgroundColor:selectedReportData.color,
                  
                  
                  paddingHorizontal:8, paddingVertical:5, borderRadius:12}}>
                  <Text style={{fontSize:10, color:"white"}}>{selectedReportData.status}</Text>
                </View>

                <Text style={styles.title}>{selectedReportData.issue}</Text>
                {/* <Text>{selectedReportData.issue}</Text> */}
                <View style={{display:"flex", justifyContent:"center", alignItems:"center", width:"100%", borderTopColor:"black", borderTopWidth:1, paddingTop:15}}>
                  <Image 
                    source={{ uri: selectedReportData?.imageURL }}
                    style={{ width: 200, height: 200 }} 
                  />

                  {selectedReportData.canResolve && 
                    // <TouchableOpacity style={styles.button}>
                    //   <Text style={styles.buttonText}>
                    //     Is this issue resolved? <Ionicons name="checkmark" size={17} ></Ionicons>
                    //   </Text>
                    // </TouchableOpacity>
                    <AnimatedButton disabled={false} />
                  }

                  <TouchableOpacity style={[styles.button, styles.close]} onPress={() => {setShowResolutionModal(false)}}>
                    <Text style={[styles.buttonText, { color: "white" }]}>Close</Text>
                  </TouchableOpacity>

                </View>
              </View>
            </View> 
          </Modal>
          }
    </View>
    
  );
}

const styles = StyleSheet.create({ 
  container: { flex: 1 } ,
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)",

    alignItems: "center",
  },
  modal: {
    width: "90%",
    marginTop:500,
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    paddingTop:10,
    marginBottom:10,
  },
  button: {
    width: "70%",
    padding: 8,
    backgroundColor: "#00d23fff",
    borderRadius: 5,
    marginVertical: 5,
    alignItems: "center",
    justifyContent:"center",
    display:"flex",
    flexDirection:"row",
    alignSelf:"center"
  },
  close: {
    backgroundColor: "#ff0000ff",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    marginRight:10,
    alignSelf:"center"
  },
});
