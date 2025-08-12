import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get('window');

const Alert = ({
  open,
  onConfirm,
  onCancel,
  title = "Alert",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  icon,
  iconBg,
  confirmColor,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }
        ]}>
          {icon && (
            <View style={[
              styles.iconWrapper,
              {
                backgroundColor: iconBg || theme.colors.primary,
                shadowColor: iconBg || theme.colors.primary,
              }
            ]}>
              {icon}
            </View>
          )}
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            {onCancel && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: theme.colors.buttonSecondary }
                ]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.buttonText,
                  styles.cancelButtonText,
                  { color: theme.colors.text }
                ]}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: confirmColor || theme.colors.primary }
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={[
                styles.buttonText,
                styles.confirmButtonText,
              ]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    width: width * 0.85,
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {},
  cancelButtonText: {},
  confirmButtonText: {
    color: '#fff',
  },
});

export default Alert;