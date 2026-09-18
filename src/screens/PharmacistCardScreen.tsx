import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Config } from '../constants/config';

export function PharmacistCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    salt: string;
    strength: string;
    form: string;
    brand: string;
  }>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.teal800} />

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        hitSlop={16}
      >
        <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.label}>SHOW THIS TO YOUR PHARMACIST</Text>

        <View style={styles.divider} />

        <Text style={styles.heading}>I need a medicine with:</Text>

        <Text style={styles.saltName}>{params.salt || 'Unknown salt'}</Text>

        {params.strength ? (
          <Text style={styles.strength}>{params.strength}</Text>
        ) : null}

        {params.form ? (
          <Text style={styles.form}>{params.form}</Text>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.instruction}>
          Any brand with this exact composition will work.
          {'\n'}Please give me the most affordable option.
        </Text>

        {params.brand ? (
          <Text style={styles.originalBrand}>
            Original brand: {params.brand}
          </Text>
        ) : null}
      </View>

      <Text style={styles.disclaimer}>
        Prices from {Config.DATASET_DATE} · SameSalt is not medical advice
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.teal800,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.teal600,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    width: '100%',
    marginVertical: 20,
  },
  heading: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  saltName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
  },
  strength: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.teal700,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  instruction: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  originalBrand: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 20,
  },
});
