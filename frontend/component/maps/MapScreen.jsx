import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Button, StyleSheet } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';

export default function MapScreen() {
  const [htmlContent, setHtmlContent] = useState(null);
  const webviewRef = useRef(null);

  useEffect(() => {
    const loadHtml = async () => {
      const asset = Asset.fromModule(require('../../assets/leaflet.html'));
      await asset.downloadAsync();
      const content = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setHtmlContent(content);
    };

    loadHtml();
  }, []);

  if (!htmlContent) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  const sendMessage = (data) => {
    webviewRef.current.postMessage(JSON.stringify(data));
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ flex: 1 }}
      />

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
