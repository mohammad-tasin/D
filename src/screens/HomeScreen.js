import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import { MaterialIcons } from '@expo/vector-icons';
import { buildHighResPDFHtml, generatePDFFilename } from '../utils/pdfGenerator';

const THUMBNAIL_SIZE = 100;

export default function HomeScreen({ navigation }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const screenRef = useRef(null);

  // ─── Permission helpers ────────────────────────────────────────────────────

  async function requestMediaPermissions() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please grant photo library access in your device settings to pick images.'
      );
      return false;
    }
    return true;
  }

  async function requestCameraPermissions() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please grant camera access in your device settings to capture screens.'
      );
      return false;
    }
    return true;
  }

  async function requestSavePermissions() {
    if (Platform.OS === 'android') {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please grant storage access in your device settings to save PDFs.'
        );
        return false;
      }
    }
    return true;
  }

  // ─── Image picking ────────────────────────────────────────────────────────

  async function pickFromGallery() {
    const granted = await requestMediaPermissions();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,         // Full quality – no compression
      exif: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedImages((prev) => [...prev, ...result.assets]);
    }
  }

  async function pickFromCamera() {
    const granted = await requestCameraPermissions();
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,         // Full quality – no compression
      exif: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedImages((prev) => [...prev, ...result.assets]);
    }
  }

  // ─── Screen capture ───────────────────────────────────────────────────────

  async function captureScreen() {
    try {
      setLoading(true);
      setLoadingMessage('Capturing screen…');

      // Capture the scroll view content at high resolution (3× device pixels).
      const uri = await captureRef(screenRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        // 3× pixel ratio gives ~300 DPI on a typical 1× 160-DPI screen.
        pixelRatio: 3,
        snapshotContentContainer: false,
      });

      setSelectedImages((prev) => [
        ...prev,
        { uri, width: undefined, height: undefined },
      ]);
    } catch (error) {
      Alert.alert('Capture failed', error.message || 'Could not capture the screen.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }

  // ─── PDF generation ───────────────────────────────────────────────────────

  async function generatePDF() {
    if (selectedImages.length === 0) {
      Alert.alert('No images', 'Please select or capture at least one image first.');
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage('Generating high-resolution PDF…');

      // Convert image URIs to base64 so they survive the WebView rendering step
      // inside expo-print and are embedded at full fidelity.
      const base64Uris = await Promise.all(
        selectedImages.map(async (img) => {
          if (img.uri.startsWith('data:')) {
            return img.uri;
          }
          const base64 = await FileSystem.readAsStringAsync(img.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          // Detect whether it's a PNG (PNG magic bytes: 89 50 4E 47)
          const isPng =
            img.uri.toLowerCase().endsWith('.png') ||
            base64.startsWith('iVBOR'); // base64 PNG magic
          const mime = isPng ? 'image/png' : 'image/jpeg';
          return `data:${mime};base64,${base64}`;
        })
      );

      const html = buildHighResPDFHtml(base64Uris);

      setLoadingMessage('Rendering PDF…');
      const { uri: pdfUri } = await Print.printToFileAsync({
        html,
        // width / height are in points. 595×842 = A4.
        width: 595,
        height: 842,
        base64: false,
      });

      setLoading(false);
      setLoadingMessage('');

      navigation.navigate('PDFViewer', { pdfUri });
    } catch (error) {
      setLoading(false);
      setLoadingMessage('');
      Alert.alert('PDF generation failed', error.message || 'An error occurred.');
    }
  }

  // ─── Image list helpers ───────────────────────────────────────────────────

  function removeImage(index) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAll() {
    Alert.alert('Clear all', 'Remove all selected images?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setSelectedImages([]) },
    ]);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderThumbnail = ({ item, index }) => (
    <View style={styles.thumbnailWrapper}>
      <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="cover" />
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => removeImage(index)}
        accessibilityLabel={`Remove image ${index + 1}`}
      >
        <MaterialIcons name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={screenRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero banner ── */}
        <View style={styles.heroBanner}>
          <MaterialIcons name="picture-as-pdf" size={64} color="#fff" />
          <Text style={styles.heroTitle}>High-Resolution PDF</Text>
          <Text style={styles.heroSubtitle}>
            Convert any image or screen capture into a crisp, zoomable PDF
          </Text>
        </View>

        {/* ── Action buttons ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnBlue]}
            onPress={pickFromGallery}
            accessibilityLabel="Pick images from gallery"
          >
            <MaterialIcons name="photo-library" size={28} color="#fff" />
            <Text style={styles.actionBtnText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnGreen]}
            onPress={pickFromCamera}
            accessibilityLabel="Take photo with camera"
          >
            <MaterialIcons name="camera-alt" size={28} color="#fff" />
            <Text style={styles.actionBtnText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnPurple]}
            onPress={captureScreen}
            accessibilityLabel="Capture current screen"
          >
            <MaterialIcons name="screenshot" size={28} color="#fff" />
            <Text style={styles.actionBtnText}>Screen</Text>
          </TouchableOpacity>
        </View>

        {/* ── Selected images ── */}
        {selectedImages.length > 0 && (
          <View style={styles.imagesSection}>
            <View style={styles.imagesSectionHeader}>
              <Text style={styles.sectionTitle}>
                Selected ({selectedImages.length})
              </Text>
              <TouchableOpacity onPress={clearAll}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedImages}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderThumbnail}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
            />
          </View>
        )}

        {/* ── Generate PDF button ── */}
        <TouchableOpacity
          style={[
            styles.generateBtn,
            selectedImages.length === 0 && styles.generateBtnDisabled,
          ]}
          onPress={generatePDF}
          disabled={selectedImages.length === 0}
          accessibilityLabel="Generate PDF"
        >
          <MaterialIcons name="picture-as-pdf" size={24} color="#fff" />
          <Text style={styles.generateBtnText}>Generate PDF</Text>
        </TouchableOpacity>

        {/* ── Tips ── */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips</Text>
          <Text style={styles.tipItem}>• Select multiple images to combine into one PDF</Text>
          <Text style={styles.tipItem}>• Use "Screen" to snapshot the current view</Text>
          <Text style={styles.tipItem}>• PDFs are generated at 300 DPI – zoom in freely</Text>
          <Text style={styles.tipItem}>• Share or save the PDF from the preview screen</Text>
        </View>
      </ScrollView>

      {/* ── Loading overlay ── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },

  // Hero
  heroBanner: {
    backgroundColor: '#1a73e8',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  btnBlue: { backgroundColor: '#1a73e8' },
  btnGreen: { backgroundColor: '#34a853' },
  btnPurple: { backgroundColor: '#8e44ad' },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },

  // Thumbnails
  imagesSection: {
    marginBottom: 24,
  },
  imagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  clearAllText: {
    color: '#e53935',
    fontSize: 13,
    fontWeight: '600',
  },
  thumbnailList: {
    paddingRight: 8,
  },
  thumbnailWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#e53935',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Generate button
  generateBtn: {
    flexDirection: 'row',
    backgroundColor: '#e53935',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  generateBtnDisabled: {
    backgroundColor: '#bdbdbd',
    elevation: 0,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  // Tips card
  tipsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 22,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
});
