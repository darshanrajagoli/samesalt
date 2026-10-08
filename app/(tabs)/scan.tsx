import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { scanMedicineStrip, ScanResult } from '../../src/utils/scan';
import { resolveScan } from '../../src/utils/resolve';
import { Button, T } from '../../src/components/ui';

const FRAME_W = 300;
const FRAME_H = 190;

export default function ScanScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [read, setRead] = useState<ScanResult | null>(null);
  const cameraRef = useRef<CameraView>(null);

  async function processImage(base64: string) {
    setBusy(true);
    setRead(null);
    try {
      const scan = await scanMedicineStrip(base64);
      setRead(scan);

      const medicine = await resolveScan(scan.brand_name, scan.salt_composition);
      if (!medicine) {
        Alert.alert(
          'Not in the database',
          `Read "${scan.brand_name || scan.salt_composition || 'unknown'}" from the strip, but couldn't match it. Try searching by name.`
        );
        setBusy(false);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Let the user see what was read before moving on.
      setTimeout(() => {
        router.push({
          pathname: '/results',
          params: { medicineId: medicine.id.toString(), scannedBrand: scan.brand_name || '' },
        });
        setBusy(false);
        setRead(null);
      }, 1100);
    } catch (err: any) {
      Alert.alert('Couldn’t read the strip', err?.message || 'Try again with the name in focus, or search instead.');
      setBusy(false);
    }
  }

  const capture = async () => {
    if (!cameraRef.current || busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7, exif: false });
    if (photo?.base64) processImage(photo.base64);
  };

  const pickPhoto = async () => {
    if (busy) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });
    const asset = res.canceled ? null : res.assets[0];
    if (asset?.base64) processImage(asset.base64);
  };

  if (!permission) {
    return <View style={[styles.black, styles.center]}><ActivityIndicator color={Colors.white} /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permission, styles.center]}>
        <Ionicons name="camera" size={56} color={Colors.tertiaryLabel} />
        <T v="title2" align="center" style={{ marginTop: 16 }}>Scan medicine strips</T>
        <T v="subhead" color={Colors.secondaryLabel} align="center" style={{ marginTop: 8, marginBottom: 24 }}>
          SameSalt reads the brand and salt printed on the strip. Photos are sent only to read the text
          and are never stored.
        </T>
        <Button title="Allow Camera" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
        <Button title="Choose a Photo Instead" kind="plain" onPress={pickPhoto} style={{ marginTop: 6 }} />
      </SafeAreaView>
    );
  }

  // Tab screens stay mounted; release the camera when the tab isn't visible.
  if (!isFocused) return <View style={styles.black} />;

  return (
    <View style={styles.black}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.hintPill}>
          <T v="footnote" weight="medium" color={Colors.white}>
            {busy ? (read ? 'Matching…' : 'Reading the strip…') : 'Fit the name on the strip in the frame'}
          </T>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <Corner style={{ top: 0, left: 0 }} rotate="0deg" />
            <Corner style={{ top: 0, right: 0 }} rotate="90deg" />
            <Corner style={{ bottom: 0, right: 0 }} rotate="180deg" />
            <Corner style={{ bottom: 0, left: 0 }} rotate="270deg" />
            {busy && !read ? <ActivityIndicator color={Colors.white} size="large" /> : null}
          </View>
        </View>

        {read ? (
          <View style={styles.readCard}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.green} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <T v="headline" numberOfLines={1}>{read.brand_name || 'Medicine found'}</T>
              <T v="footnote" color={Colors.secondaryLabel} numberOfLines={1}>
                {read.salt_composition || ''}
              </T>
            </View>
          </View>
        ) : null}

        <View style={styles.controls}>
          <Pressable onPress={pickPhoto} style={styles.sideBtn} hitSlop={10} accessibilityLabel="Choose photo" accessibilityRole="button">
            <Ionicons name="images" size={24} color={Colors.white} />
          </Pressable>
          <Pressable
            onPress={capture}
            disabled={busy}
            accessibilityLabel="Take photo"
            accessibilityRole="button"
            style={({ pressed }) => [styles.shutter, (pressed || busy) && { opacity: 0.6 }]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.sideBtn} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function Corner({ style, rotate }: { style: object; rotate: string }) {
  return <View style={[styles.corner, style, { transform: [{ rotate }] }]} />;
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: Colors.black },
  center: { alignItems: 'center', justifyContent: 'center' },
  permission: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 32 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  hintPill: {
    alignSelf: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  frameWrap: { alignItems: 'center' },
  frame: { width: FRAME_W, height: FRAME_H, alignItems: 'center', justifyContent: 'center' },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: Colors.white,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  readCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    marginHorizontal: 24,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 22,
    paddingBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sideBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: Colors.white },
});
