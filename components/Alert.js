import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LogOut, FastForward } from 'lucide-react-native'; // Import whatever icons you need

const { width } = Dimensions.get('window');

const Alert = ({
  open,
  onConfirm,
  onCancel,
  title = "Alert",
  message = "",
  confirmText = "Yes",
  cancelText = "Cancel",
  icon = <LogOut color="#fff" size={40} />, // Pass an icon element (or null)
  iconBg = "#6366f1", // Pass background color for icon
  confirmColor = "#6366f1", // Confirm button color
  cancelColor = "#f1f5f9",  // Cancel button color
  confirmTextColor = "#fff", // Confirm text color
  cancelTextColor = "#334155", // Cancel text color
  showIcon = true,
}) => {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {showIcon && (
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              {icon}
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={{ height: 16 }} />
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: confirmColor }]}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={[styles.confirmText, { color: confirmTextColor }]}>{confirmText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: cancelColor }]}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelText, { color: cancelTextColor }]}>{cancelText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: width * 0.85,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  confirmText: {
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  cancelBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});

export default Alert;
