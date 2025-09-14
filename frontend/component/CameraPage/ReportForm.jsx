import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated
} from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { transcribeDesc } from "../../services/transcription";
import axios from "axios";
import * as SecureStore from "expo-secure-store"
import { LinearGradient } from "expo-linear-gradient";
import SubmitButton from "../SubmitButton";
import uuid from 'react-native-uuid';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generatePDF } from '../../services/pdfGeneration';

const ReportForm = ({ coordinates, showLocationMessage, showImagePreview, predictions, image }) => {
  const [category, setCategory] = useState("")
  const [recording, setRecording] = useState(null)
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [description, setDescription] = useState("")
  const [name, setName] = useState("");
  const progressAnim = useState(new Animated.Value(0))[0];
  const userId = SecureStore.getItem("userId");
  const locInWords = [coordinates.readableLoc?.name, coordinates.readableLoc?.street, coordinates.readableLoc?.city, coordinates.readableLoc?.region, coordinates.readableLoc?.postalCode, coordinates.readableLoc?.country].filter(Boolean).join(", ");

  useEffect(() => {
    const getUserName = async () => {
      try {
        const response = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}api/user/getUserName`, {
          id : userId
        })
        setName(response.data.name)
      } catch (err) {
        console.error(err);
      }
    }
    getUserName()
  }, [])
  
  const createAndStoreReportData = async (reportData) => {
    const reportFolder = `${FileSystem.documentDirectory}reports/${reportData.reportID}/`;
    await FileSystem.makeDirectoryAsync(reportFolder, {intermediates: true});

    await FileSystem.copyAsync({from : image, to: `${reportFolder}image.jpeg`});


    if (audioUri) await FileSystem.copyAsync({from : audioUri, to: `${reportFolder}audio.m4a`});

    await FileSystem.writeAsStringAsync(`${reportFolder}data.json`, JSON.stringify(reportData), {
      encoding: FileSystem.EncodingType.UTF8
    })

    const pendingReports = JSON.parse(await AsyncStorage.getItem("pendingReports")) || [];
    pendingReports.push(reportData.reportID);
    await AsyncStorage.setItem("pendingReports", JSON.stringify(pendingReports));
  }

  const handleReportSubmit = async () => {

    if (!category) {
      Alert.alert("Issue category required.");
      return;
    }
    if (!name) {
      Alert.alert("Username required")
      return;
    }
    const rId = `Rid_${uuid.v4().replaceAll("-", "").slice(0, 12)}`
    const reportData = {
      reportID : rId,
      userID: userId,
      name:name,
      number : null,
      category:category,
      description:description,
      location : {lat : coordinates.latitude, lng : coordinates.longitude, loc : locInWords},
      createdDate : new Date().toISOString(),
    }
    console.log(new Date(reportData.createdDate).toLocaleTimeString())
    await createAndStoreReportData(reportData);

    const fileUri = await generatePDF(reportData, image);
    console.log(fileUri);
    await Sharing.shareAsync(fileUri);
    // Alert.alert(uuid.v4().replaceAll("-", "").slice(0, 12))
  }


  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Audio recording permission is required');
        return;
      }
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true 
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setIsRecording(true);
      setRecording(recording);
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      transcribe(uri);
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };
  const transcribe = async (uri) => {
    try {
      setIsTranscribing(true);
      const result = await transcribeDesc(uri);
      setIsTranscribing(false);
      if (result.success) {
        setDescription(result.result.text); // ✅ result.result.text
      } else {
        Alert.alert("Failed to transcribe");
      }
    } catch (err) {
      console.error(err);
      setIsTranscribing(false);
      Alert.alert("Failed to transcribe", err.message);
    }
  };
  const playSound = async () => {
    try {
      if (!audioUri) return;
      
      // If sound is already loaded and paused, just resume
      // if (sound && !isPlaying) {
      //   await sound.playAsync();
      //   setIsPlaying(true);
      //   return;
      // }
      
      // Create new sound instance
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        setPlaybackStatus(status);
        if (status.isLoaded) {
          setDuration(status.durationMillis || 0);
          setPosition(status.positionMillis || 0);
          setIsPlaying(status.isPlaying);

          if (status.durationMillis > 0) {
            const progress = status.positionMillis / status.durationMillis;
            progressAnim.setValue(progress);
          }
          
          // Auto-stop when finished
          if (status.didJustFinish) {
            setIsPlaying(false);
            progressAnim.setValue(0);
          }
        }
      });
      
    } catch (error) {
      console.error('Failed to play sound', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const pauseSound = async () => {
    try {
      if (sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Failed to pause sound', error);
    }
  };

  const deleteAudio = async () => {
    try {
      Alert.alert(
        'Delete Recording',
        'Are you sure you want to delete this audio recording?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              if (sound) {
                await sound.unloadAsync();
                setSound(null);
              }
              setAudioUri(null);
              setDescription("");
              setIsPlaying(false);
              setPosition(0);
              setDuration(0);
              progressAnim.setValue(0);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to delete audio', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [sound, recording]);

  

  // Progress circle component
  const ProgressCircle = ({ progress }) => {
    const circumference = 2 * Math.PI * 18; // radius = 18
    const strokeDashoffset = circumference - (progress * circumference);
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressCircle}>
          <View style={[styles.progressBackground, { 
            borderColor: 'rgba(255,255,255,0.3)',
            borderWidth: 2 
          }]} />
          <Animated.View 
            style={[
              styles.progressForeground,
              {
                borderColor: '#4CAF50',
                borderWidth: 2,
                transform: [{
                  rotate: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg']
                  })
                }]
              }
            ]}
          />
        </View>
      </View>
    );
  };

  // Get the appropriate icon and action based on current state
  const getMainButtonConfig = () => {
    if (isRecording) {
      return {
        icon: "stop",
        iconSet: MaterialCommunityIcons,
        action: stopRecording,
        color: "#f44336"
      };
    }
    
    if (audioUri) {
      if (isPlaying) {
        return {
          icon: "pause",
          iconSet: MaterialCommunityIcons,
          action: pauseSound,
          color: "#FF9800"
        };
      } else {
        return {
          icon: "play",
          iconSet: MaterialCommunityIcons,
          action: playSound,
          color: "#4CAF50"
        };
      }
    }
    
    return {
      icon: "microphone",
      iconSet: MaterialCommunityIcons,
      action: startRecording,
      color: "#2196F3"
    };
  };

  const mainButton = getMainButtonConfig();
  const IconComponent = mainButton.iconSet;

  return (
    <>
      <View style={[styles.formContainer, {marginTop: !showImagePreview ? 120: 0}]}>
        <Text style={styles.label}>Coordinates</Text>
        {coordinates.latitude ? 
          <>
            {showLocationMessage && coordinates.message ? 
              <Text style={{fontSize:12}}>{coordinates.message}</Text>
              :
              <TextInput 
                placeholder="Enter your name" 
                style={[styles.input, {backgroundColor:"rgba(188, 188, 188, 0.53)"}]} 
                value={`${coordinates.latitude}, ${coordinates.longitude} \n(${locInWords})`}
                multiline
                editable={false}
              /> 
            }
          </>
          :
          <Text>Fetching location...</Text>
        }

        <Text style={styles.label}>Username <Text style={{color:"red", fontSize:23}}>*</Text></Text>
        <TextInput
          placeholder="Name"
          style={[styles.input, {paddingLeft:12}]}
          placeholderTextColor={"lightgrey"}
          value={name}
          onChangeText={setName}
          editable={false}
        />

        <Text style={styles.label}>Category <Text style={{color:"red", fontSize:23}}>*</Text></Text>
        <TextInput
          placeholder="Enter issue (or pick from below)"
          style={[styles.input, {paddingLeft:12}]}
          placeholderTextColor={"lightgrey"}
          value={category}
          onChangeText={setCategory}
        />
        
        <View style={{
          display:"flex",
          flexDirection:"row",
          flexWrap: "wrap",
          gap:4,
          marginBottom:10
        }}>
          {predictions ? 
            (predictions.length > 0 ?
              predictions.map((p, i) => (
                <Text key={i} onPress={() => setCategory(prev => {
                  if (!prev) return p.issue;
                  const items = prev.split(", ").filter(Boolean);

                  return items.includes(p.issue)
                    ? items.filter(item => item !== p.issue).join(", ")
                    : [...items, p.issue].join(", ");
                })
                
              }
                  style={{
                    backgroundColor:"rgba(255, 255, 255, 0.43)", 
                    borderRadius:100,
                    padding: 7,
                    paddingRight:12,
                    paddingLeft:12,
                    color:"white", 
                    fontSize:10,
                    textAlign:"center",
                    borderWidth:category.includes(p.issue) ? 2 : 0,
                    borderColor: category.includes(p.issue) ? "blue" : ""
                  }}>
                  {p.issue}
                </Text>
              ))
              : 
              <>
              <Ionicons name="warning" color="red" size={22} />
              <Text style={{color:"rgba(255, 65, 65, 1)"}}>No issues detected</Text>
              </>)
            :
            <View style={{display:"flex", alignItems:"center", flexDirection:"row", gap:5}}> 
              <ActivityIndicator size="large" color="#b9bc00ff" />
              <Text style={{color:"rgba(207, 207, 207, 1)"}}>Detecting issues...</Text>
            </View>
          }
        </View>

        <Text style={styles.label}>Description</Text>
        <View style={{display:"flex", flexDirection:"row", alignItems:"center", gap:12}}>
          {isTranscribing ? 
            <View style={{
              width:"80%",
              height:80, paddingRight:40,
              borderWidth: "1px",
              borderColor:"white",
              
            }}>
              <ActivityIndicator />
              <Text style={{color:"rgba(194, 194, 194, 1)", textAlign:"center"}}>Transcribing audio...</Text>
            </View>
          :
            <TextInput
              placeholder="Enter description"
              placeholderTextColor={"lightgrey"}
              multiline
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { height: 120, paddingRight: 40, width:"80%"}]}
            />
          }

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.mainButton, { backgroundColor: mainButton.color }]} 
              onPress={mainButton.action}
            >
              <IconComponent name={mainButton.icon} size={30} color="white" />
              {(isPlaying || (audioUri && position > 0)) && (
                <ProgressCircle progress={duration > 0 ? position / duration : 0} />
              )}
            </TouchableOpacity>
            
            {/* Recording indicator */}
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
              </View>
            )}
            {audioUri && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => {
                isTranscribing ? Alert.alert("Cannot delete while transcribing") : deleteAudio()
              }}
            >
              <MaterialCommunityIcons name={isTranscribing ? "delete-off" : "delete"} size={24} color="#f44336" />
            </TouchableOpacity>
          )}
          </View>

          
        </View>
        
        <SubmitButton handleReportSubmit={handleReportSubmit} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    padding: 30,
    color:"white"
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
    color:"rgba(231, 231, 231, 1)"
  },
  input: {
    borderWidth: 1,
    color:"rgba(231, 231, 231, 1)",
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 5,
  },
  buttonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    gap:10
  },
  mainButton: {
    padding: 12,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 25,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBackground: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  progressForeground: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: '#4CAF50',
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  recordingIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  audioInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  audioInfoText: {
    color: 'rgba(231, 231, 231, 0.8)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default ReportForm;