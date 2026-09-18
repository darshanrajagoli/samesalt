import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { NTI_WARNING } from '../constants/nti';

export function NTIWarning() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning" size={24} color={Colors.ntiRed} />
        <Text style={styles.title}>⚠️ Narrow Therapeutic Index Drug</Text>
      </View>
      <Text style={styles.message}>{NTI_WARNING}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.ntiRed,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ntiRed,
  },
  message: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },
});
