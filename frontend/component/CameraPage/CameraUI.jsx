
import Slider from "@react-native-community/slider";
import { CameraView } from "expo-camera";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  View,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView
} from "react-native-gesture-handler";
import { Button } from "react-native-paper";
const CameraUI = ({
    flash, setFlash,
    zoom, setZoom,
    CameraType, setCameraType,
    pinchGesture,
    cameraRef,
    takePicture,
    pickImage
}) => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={pinchGesture}>
            <View style={{ flex: 1 }}>
                <CameraView
                style={styles.camera}
                facing={CameraType}
                ref={cameraRef}
                photo={{ qualityPrioritization: "quality", quality: 1 }}
                autoFocus="on"
                whiteBalance="auto"
                zoom={zoom}
                useCamera2Api={true}
                enableTorch={false}
                flash={flash}
                />
            </View>
        </GestureDetector>

        <Slider
        style={{
            width: "50%",
            height: 20,
            position: "absolute",
            bottom: 150,
            alignSelf: "center",
        }}
        minimumValue={0}
        maximumValue={1}
        step={0.01}
        value={zoom}
        onValueChange={setZoom}
        />
        <TouchableOpacity style={styles.flashBtn} onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}>
            {flash === 'off' ? 
            <MaterialIcons name="flash-off" color="white" size={25}/> : 
            <MaterialIcons name="flash-on" color="white" size={25}/>  
            }
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureBtn} onPress={takePicture} />
        <TouchableOpacity
            onPress={() => setCameraType(CameraType === "back" ? "front" : "back")}
            style={styles.button}
        >
            <Ionicons name="camera-reverse" size={30} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { left: 280 }]}>
            <Button title="" onPress={pickImage}>
                <Ionicons name="image" size={26} color="white" />
            </Button>
        </TouchableOpacity>
    </GestureHandlerRootView>
  )
}
const styles = StyleSheet.create({
    button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "transparent",
    position: "absolute",
    bottom: 40,
    left: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  flashBtn: {
    width: 40,
    height: 40,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "transparent",
    position: "absolute",
    top:80,
    right: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: { flex: 1 },
  captureBtn: {
    width: 90,
    height: 90,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "transparent",
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },
})

export default CameraUI
