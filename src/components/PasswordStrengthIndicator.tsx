import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './AuthComponents';

interface PasswordStrengthIndicatorProps {
  password: string;
  onStrengthChange?: (isStrong: boolean) => void;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  onStrengthChange,
}) => {
  const [showRequirements, setShowRequirements] = useState(false);

  // Password requirement checks
  const hasLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  // Check if all requirements are met
  const allRequirementsMet = hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  
  // Count how many requirements are met
  const requirementsMet = [hasLength, hasUppercase, hasLowercase, hasNumber, hasSpecial]
    .filter(Boolean).length;
  
  // Calculate strength status
  const getStrengthColor = (): string => {
    if (allRequirementsMet) return COLORS.success; // Green
    if (requirementsMet >= 3) return '#FFD600'; // Yellow
    return COLORS.error; // Red
  };

  // Notify parent component about strength changes
  React.useEffect(() => {
    if (onStrengthChange) {
      onStrengthChange(allRequirementsMet);
    }
  }, [allRequirementsMet, onStrengthChange]);
  
  const color = getStrengthColor();
  
  // Calculate percentage for progress bar (0-100%)
  const strengthPercentage = Math.min(100, (requirementsMet / 5) * 100);
  
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.strengthLabel}>Password Strength</Text>
        
        <View style={styles.barContainer}>
          <View style={[styles.strengthBar, { width: `${strengthPercentage}%`, backgroundColor: color }]} />
        </View>
        
        <TouchableOpacity onPress={() => setShowRequirements(!showRequirements)}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <Modal
        transparent={true}
        visible={showRequirements}
        animationType="fade"
        onRequestClose={() => setShowRequirements(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowRequirements(false)}
        >
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password Requirements</Text>
            
            <View style={styles.requirementRow}>
              <Text style={[styles.requirementText, hasLength && styles.requirementMet]}>
                At least 6 characters
              </Text>
            </View>
            
            <View style={styles.requirementRow}>
              <Text style={[styles.requirementText, hasUppercase && styles.requirementMet]}>
                At least one uppercase letter
              </Text>
            </View>
            
            <View style={styles.requirementRow}>
              <Text style={[styles.requirementText, hasLowercase && styles.requirementMet]}>
                At least one lowercase letter
              </Text>
            </View>
            
            <View style={styles.requirementRow}>
              <Text style={[styles.requirementText, hasNumber && styles.requirementMet]}>
                At least one number
              </Text>
            </View>
            
            <View style={styles.requirementRow}>
              <Text style={[styles.requirementText, hasSpecial && styles.requirementMet]}>
                At least one special character
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowRequirements(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    flex: 0.4, // Reduced width proportion
  },
  barContainer: {
    height: 4, // Reduced height
    backgroundColor: COLORS.border,
    borderRadius: 1.5, // Half of height
    overflow: 'hidden',
    flex: 0.5, // Increased width proportion
    marginHorizontal: 0, // Reduced margin
  },
  strengthBar: {
    height: '100%',
    borderRadius: 1.5, // Half of height
    width: '0%', // Will be set dynamically
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementsContainer: {
    width: '80%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requirementsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 22,
    textAlign: 'center',
  },
  requirementRow: {
    marginBottom: 16,
  },
  requirementText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '400',
  },
  requirementMet: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  closeButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 16,
  },
});

export default PasswordStrengthIndicator; 