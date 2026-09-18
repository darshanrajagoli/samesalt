import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { scanMedicineStrip } from '../../src/utils/scan';
import { searchByName, searchBySalt } from '../../src/utils/db';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || scanning) return;

    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        exif: false,
      });

      if (!photo?.base64) {
        Alert.alert('Error', 'Failed to capture photo');
        setScanning(false);
        return;
      }

      // Send to vision API
      const scanResult = await scanMedicineStrip(photo.base64);

      // Search local DB for the scanned medicine
      let medicines = [];
      if (scanResult.brand_name) {
        medicines = await searchByName(scanResult.brand_name, 5);
      }
      if (medicines.length === 0 && scanResult.salt_composition) {
        medicines = await searchBySalt(scanResult.salt_composition, 5);
      }

      if (medicines.length > 0) {
        // Navigate to results with the best match
        const best = medicines[0];
        router.push({
          pathname: '/results',
          params: {
            medicineId: best.id.toString(),
            canonicalKey: best.canonical_key,
            name: best.name,
            scannedBrand: scanResult.brand_name || '',
            scannedSalt: scanResult.salt_composition || '',
          },
        });
      } else {
        Alert.alert(
          'Not Found',
          `Scanned: ${scanResult.brand_name || scanResult.salt_composition || 'Unknown'}\n\nThis medicine was not found in our database. Try searching manually.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message || 'Could not scan the strip. Try again or search manually.');
    }
    setScanning(false);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.teal600} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color={Colors.gray300} />
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permDesc}>
          SameSalt needs your camera to scan medicine strips and identify their
          salt composition.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        {/* Scan overlay */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              {scanning && (
                <View style={styles.scanningOverlay}>
                  <ActivityIndicator size="large" color={Colors.white} />
                  <Text style={styles.scanningText}>Analyzing strip...</Text>
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.instructions}>
              Position the medicine strip inside the frame
            </Text>

            <TouchableOpacity
              style={[styles.captureBtn, scanning && styles.captureBtnDisabled]}
              onPress={handleCapture}
              disabled={scanning}
            >
              <View style={styles.captureBtnInner}>
                {scanning ? (
                  <ActivityIndicator color={Colors.teal700} />
                ) : (
                  <Ionicons name="scan" size={32} color={Colors.teal700} />
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Uses AI to read salt composition from the strip
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.background,
    gap: 16,
  },
  camera: { flex: 1 },
  overlay: { flex: 1 },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row', height: 200 },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanFrame: {
    width: 300,
    height: 200,
    borderWidth: 2,
    borderColor: Colors.teal400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  scanningText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  overlayBottom: {
    flex: 1.5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 24,
    gap: 16,
  },
  instructions: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  permTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  permDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: Colors.teal700,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  permBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
