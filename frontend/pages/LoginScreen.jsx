import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import axios from 'axios';

const backendURL = process.env.EXPO_PUBLIC_BACKEND_URL; // replace with your backend
export default function LoginScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    const userId = await SecureStore.getItemAsync('userId');
    if (userId) {
      // Existing user → biometric authentication
      const bio = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (bio && enrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to continue',
        });
        if (result.success) {
          navigation.replace('Home'); // replace with your home/camera page
        } else {
          Alert.alert('Authentication failed');
        }
      } else {
        // fallback if no biometric → go to home anyway
        navigation.replace('Home');
      }
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    if (!name) {
      setLoading(false);
      Alert.alert("Please enter your name!")
      return;
    }
    try {
      // Send to backend to create user

      const res = await axios.post(`${backendURL}api/user/createUser`, {
        name: name || null,
        phone: phone || null,
      });
      const userId = res.data.user.id; // backend returns userId

      // Store in SecureStore for future logins
      await SecureStore.setItemAsync('userId', userId.toString());

      // Prompt biometric authentication setup
      const bio = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (bio && enrolled) {
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to secure your account',
        });
      }

      navigation.replace('Home');
    } catch (err) {
      console.error(err);
      Alert.alert('Failed to register user');
    }
    setLoading(false);
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <TextInput
        placeholder="Enter name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="Phone (optional)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />
      <Button title="Continue" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});
