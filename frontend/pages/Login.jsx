import React, { useEffect } from 'react'
import { Text, View } from 'react-native'


const Login = ({ navigation }) => {
  useEffect(() => {
    setTimeout(() => {
      navigation.replace("Home")
    }, 3000)
  }, [])
  return (
    <View>
      <Text>Login</Text>
    </View>
  )
}

export default Login
