import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';

export default function PDFViewerScreen({ route }) {
  const { pdfUri } = route.params;
  const [saving, setSaving] = useState(false);

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function sharePDF() {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share your PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      Alert.alert('Share failed', error.message || 'Could not share the PDF.');
    }
  }

  async function savePDF() {
    try {
      setSaving(true);

      if (Platform.OS === 'android') {
        // On Android, save to Downloads directory for easy access.
        const downloadDir = `${FileSystem.documentDirectory}PDFs/`;
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });

        const filename = pdfUri.split('/').pop();
        const destPath = `${downloadDir}${filename}`;
        await FileSystem.copyAsync({ from: pdfUri, to: destPath });

        // Also create a media-library asset so it appears in Files/Downloads.
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(destPath);
        }

        Alert.alert('Saved', `PDF saved to:\n${destPath}`);
      } else {
        // On iOS, save to the document directory and create a media-library asset.
        const filename = pdfUri.split('/').pop();
        const destPath = `${FileSystem.documentDirectory}${filename}`;

        if (pdfUri !== destPath) {
          await FileSystem.copyAsync({ from: pdfUri, to: destPath });
        }

        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(destPath);
          Alert.alert('Saved', 'PDF saved to your Files app.');
        } else {
          Alert.alert('Saved', `PDF saved to:\n${destPath}`);
        }
      }
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Could not save the PDF.');
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // expo-print generates a local file URI (file://…). A WebView can render
  // PDFs natively on both iOS (WKWebView) and Android (Chromium).
  const pdfViewerHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #404040; height: 100vh; overflow: hidden; }
      embed, iframe, object {
        width: 100%;
        height: 100vh;
        border: none;
      }
    </style>
  </head>
  <body>
    <embed src="${pdfUri}" type="application/pdf" />
  </body>
</html>`;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* PDF viewer */}
      <View style={styles.viewerContainer}>
        <WebView
          source={
            Platform.OS === 'ios'
              ? { uri: pdfUri }           // WKWebView renders PDF natively on iOS
              : { html: pdfViewerHtml }    // Chromium uses the embed tag on Android
          }
          style={styles.webView}
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          scalesPageToFit
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loaderWrapper}>
              <ActivityIndicator size="large" color="#1a73e8" />
              <Text style={styles.loaderText}>Loading PDF…</Text>
            </View>
          )}
        />
      </View>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.barBtn, styles.btnShare]}
          onPress={sharePDF}
          accessibilityLabel="Share PDF"
        >
          <MaterialIcons name="share" size={22} color="#fff" />
          <Text style={styles.barBtnText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.barBtn, styles.btnSave]}
          onPress={savePDF}
          disabled={saving}
          accessibilityLabel="Save PDF"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="save-alt" size={22} color="#fff" />
              <Text style={styles.barBtnText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#404040',
  },

  // Viewer
  viewerContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#404040',
  },
  loaderWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#404040',
  },
  loaderText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  barBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  btnShare: {
    backgroundColor: '#1a73e8',
  },
  btnSave: {
    backgroundColor: '#34a853',
  },
  barBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
