import { Camera } from "expo-camera";
import { useState, useEffect, useRef } from "react";

import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import {
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  Gesture,
} from "react-native-gesture-handler";
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location'
import { detectIssues } from "../services/gemini.js";
import CameraUI from "../component/CameraPage/CameraUI.jsx";
import ReportForm from "../component/CameraPage/ReportForm.jsx";
import ImagePreview from "../component/CameraPage/ImagePreview.jsx";
import { LinearGradient } from "expo-linear-gradient";


const CameraScreen = () => {
  const [type, setType] = useState("back");
  const cameraRef = useRef(null);
  const [image, setImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash]= useState('off');
  const [predictions, setPredictions] = useState(null);
  const [showLocationMessage, setShowLocationMessage] = useState(true);
  const [coordinates, setCoordinates] = useState({})
  const [hasPermission, setHasPermission] = useState(null);
  

  const scrollY = useSharedValue(0);
  
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const arrowOffset = useSharedValue(0);
  
    const animatedArrowStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: arrowOffset.value }],
    })); 
    useEffect(() => {
      arrowOffset.value = withRepeat(
        withSequence(
          withTiming(-20, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        -1, // infinite
        true
      );
    }, [])

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);
  
  useEffect(() => {
    if (coordinates.latitude) {
      const timer = setTimeout(() => {
        setShowLocationMessage(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [coordinates]);

  const getReportLocation = async (exif) => {
    if (
      typeof exif?.GPSLatitude === "number" && exif?.GPSLatitude !== 0 &&
      typeof exif?.GPSLongitude === "number" && exif?.GPSLongitude !==0
    ) {
      let location = await Location.reverseGeocodeAsync({
        latitude: exif.GPSLatitude,
        longitude: exif.GPSLongitude,
      });

      setCoordinates({
        latitude: exif.GPSLatitude,
        longitude: exif.GPSLongitude,
        readableLoc: location[0],
      });
      return;
    }
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Location permission is required to submit a report.");
      return null;
    }
    let loc = await Location.getCurrentPositionAsync({});

    let location =await Location.reverseGeocodeAsync({latitude: loc.coords.latitude, longitude:loc.coords.longitude})

    setCoordinates({
      "latitude": loc.coords.latitude, 
      "longitude":loc.coords.longitude, 
      "readableLoc":location[0], 
      "message":exif && "Could not detect location in image. Defaulting to user location..."
    })
  };
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission required!");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.mediaTypes,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
      exif:true
    });

    if (!result.canceled) {
      getReportLocation(result.assets[0].exif);
      setImage(result.assets[0].uri);
      setShowImagePreview(true);
      const predictions = await detectIssues(
        result.assets[0].base64,
        result.assets[0].mimeType || "image/jpeg"
      );
      predictions.sort((a,b) => b.probability - a.probability)
      setPredictions(predictions);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({
      base64: true,
    });
    getReportLocation();
    setImage(photo.uri);
    setShowImagePreview(true);
    const predictions = await detectIssues(
        photo.base64,
        photo.mimeType || "image/jpeg"
      );
      predictions.sort((a,b) => b.probability - a.probability)
      setPredictions(predictions);
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      setZoom((prev) => {
        let newZoom = prev + event.scaleChange * 0.2;
        return Math.max(0, Math.min(1, newZoom));
      });
    })
    .runOnJS(true);

  const cleanUpOnCancel = () => {
    setImage(null);
    setPredictions(null);
    setCoordinates({});
    setShowLocationMessage(true);
  }
  if (hasPermission === null)
    return <Text style={{ color: "white" }}>Loading camera...</Text>;
  if (hasPermission === false)
    return <Text style={{ color: "white" }}>No access to camera</Text>;

  return (
    <View style={styles.container}>
      {image ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} 
        >
          <LinearGradient
          colors={['#185795ff', 'rgba(0, 59, 79, 0.52)', '#112f4e']}
          start={{ x: 0.5, y: 0 }}
          style={{ flexGrow: 1, 
                  paddingVertical: 20 }} >
            <Animated.ScrollView
              style={{ flex: 1, position:"relative" }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
              showsVerticalScrollIndicator={true}
              alwaysBounceVertical={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              stickyHeaderIndices={[0]}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              overScrollMode="never"
            >
              <TouchableOpacity
                onPress={cleanUpOnCancel}
                style={[styles.closeBtn]}
              >
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.collapseBtn]}
                onPress={() => setShowImagePreview(true)}
              >
                <MaterialIcons name="open-in-full" size={30} color="white" />
              </TouchableOpacity>
              {showImagePreview && 
              <>
              
                <ImagePreview 
                  image={image}
                  predictions={predictions}
                  scrollY={scrollY}
                  setShowImagePreview={setShowImagePreview}
                />

                <Animated.View style={[styles.arrowContainer, animatedArrowStyle]}>
                        <Ionicons name="arrow-down-circle" size={40} color="#ffffffff" />
                        {/* <Text style={{ color: "#444", marginTop: 4 }}>
                            Scroll to fill details
                        </Text> */}
                    </Animated.View>
                </>

              }
              <ReportForm 
                coordinates={coordinates}
                showLocationMessage={showLocationMessage}
                showImagePreview={showImagePreview}
                predictions={predictions}
                image={image}
              />
              
            </Animated.ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      ) : (
          <CameraUI 
          flash={flash}
          setFlash={setFlash}
          zoom={zoom}
          setZoom={setZoom}
          pinchGesture={pinchGesture}
          CameraType={type}
          setCameraType={setType}
          cameraRef={cameraRef}
          takePicture={takePicture}
          pickImage={pickImage}
          />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: {
    width: 50,
    height: 50,
    padding:5,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "transparent",
    position: "absolute",
    top:40,
    left: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  collapseBtn: {
    width: 50,
    height: 50,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "transparent",
    position: "absolute",
    top:40,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowContainer: {
    alignItems: "center",

  },
});

export default CameraScreen;
