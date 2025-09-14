
import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Animated, 
{ Extrapolation, 
  interpolate, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming } from "react-native-reanimated";
  import { Dimensions } from "react-native";

  
const SCREEN_HEIGHT = Dimensions.get("window").height;
const ImagePreview = ({ image, predictions, scrollY, setShowImagePreview }) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const imageOffset = useSharedValue(0);
    const imageHeight = useSharedValue(800);
    const animatedImageStyle = useAnimatedStyle(() => {
      const clampedY = Math.min(Math.max(scrollY.value, 0), 600);

      const height = interpolate(
        clampedY,
        [0, 400], // scroll range (adjust to taste)
        [imageHeight.value, SCREEN_HEIGHT * 0.2], 
        Extrapolation.CLAMP
      );

      return {
        height: withTiming(height, { duration: 50 }),
      };
  });
  
    useEffect(() => {
    imageHeight.value = withTiming(750, { duration: 1000 }); // full height
  }, [image]);

    const slideStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: imageOffset.value }],
    }));

  return (
    <Pressable onPress={() => setShowImagePreview(false)}>
      
    <Animated.View
      style={[animatedImageStyle, slideStyle]} 
    >
      <Animated.Image
        source={{ uri: image }}
        style={{ width: "100%", height: "100%", alignSelf:"center"
          }}
        resizeMode="cover"
        onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setImageSize({ width, height });
          }}
      />
      {predictions?.map((p, i) => (
        <View
          key={`v-${i}`}
          style={{
            position: "absolute",
            top: (p.bounding_box[0] / 1000) * imageSize.height,
            left: (p.bounding_box[1] / 1000) * imageSize.width,
            width:
              ((p.bounding_box[3] - p.bounding_box[1]) / 1000) *
              imageSize.width,
            height:
              ((p.bounding_box[2] - p.bounding_box[0]) / 1000) *
              imageSize.height,
            borderWidth: 2,
            borderColor: "red",
            justifyContent:"flex-end",
            alignItems:"flex-end",
          }}
        >
          <Text style={{ color: "red", fontWeight: "bold" }}>
            {p.issue}
          </Text>
        </View>
      ))}
      
    </Animated.View>
    
    </Pressable>
  )
}
const styles = StyleSheet.create({
  
})
export default ImagePreview
