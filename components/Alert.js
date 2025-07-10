import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get('window');

const Alert = ({
  open,
  onConfirm,
  onCancel,
  title = "Alert",
  message = "",
  confirmText = "Yes",
  cancelText = "Cancel",
  icon = <LogOut color="#fff" size={40} />,
  iconBg,
  confirmColor,
  cancelColor,
  confirmTextColor,
  cancelTextColor,
  showIcon = true,
  showCancel = true, 
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} >
        <View style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            borderColor: theme.colors.border,
          }
        ]}>
          {showIcon && (
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
          <View style={{ height: 16 }} />
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: confirmColor || theme.colors.error, elevation: 2 }
            ]}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={[
              styles.confirmText,
              { color: confirmTextColor || theme.colors.surface }
            ]}>{confirmText}</Text>
          </TouchableOpacity>
          {showCancel && (
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                { backgroundColor: cancelColor || theme.colors.background }
              ]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.cancelText,
                { color: cancelTextColor || theme.colors.text }
              ]}>{cancelText}</Text>
            </TouchableOpacity>
          )}
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
  },
  container: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
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
