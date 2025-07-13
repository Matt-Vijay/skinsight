import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Colors
export const COLORS = {
  primary: '#323334',  // Darker gray as requested
  background: '#FDFDFD',  // White background
  card: '#F5F5F5',  // Light gray for cards
  text: '#323334',  // Dark gray for text on light background
  textLight: '#6A6A6A',  // Medium gray for secondary text
  border: '#E5E5E5',  // Light gray for borders
  error: '#E53935',  // Red for errors (less saturated)
  success: '#43A047',  // Green for success (less saturated)
};

// Auth Container with keyboard avoiding view
export const AuthContainer: React.FC<{
  children: React.ReactNode;
  scrollEnabled?: boolean;
}> = ({ children, scrollEnabled = true }) => {
  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
    >
      {scrollEnabled ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.container}>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

// Auth Header with Logo
export const AuthHeader: React.FC<{
  title: string;
  subtitle?: string;
}> = ({ title, subtitle }) => {
  // Detect and style email addresses in subtitle
  const renderSubtitle = () => {
    if (!subtitle) return null;
    
    // Check if the subtitle contains an email address with our masking pattern
    if (subtitle.includes('@') && subtitle.includes('***')) {
      // Find the masked email in the text
      const emailMatch = subtitle.match(/(\S+\*+)(@\S+)/);
      
      if (emailMatch && emailMatch[1] && emailMatch[2]) {
        // Split the text before and after the email
        const parts = subtitle.split(emailMatch[1] + emailMatch[2]);
        const beforeEmail = parts[0];
        const afterEmail = parts.length > 1 ? parts[1] : '';
        
        // Render with the username part in normal text color and domain in lighter color
        return (
          <Text style={styles.subtitle}>
            {beforeEmail}
            <Text style={{ color: COLORS.text }}>{emailMatch[1]}</Text>
            <Text style={{ color: COLORS.textLight }}>{emailMatch[2]}</Text>
            {afterEmail}
          </Text>
        );
      }
    }
    
    // Default case if no email is found
    return <Text style={styles.subtitle}>{subtitle}</Text>;
  };
  
  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/dermlogo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      {renderSubtitle()}
    </View>
  );
};

// Auth Input Field
interface AuthInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  autoComplete?: string;
  testID?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  error,
  icon,
  rightIcon,
  onRightIconPress,
  autoComplete,
  testID,
}) => {
  // Determine iOS textContentType based on input type
  let textContentType = 'none';
  if (secureTextEntry) {
    textContentType = 'oneTimeCode'; // Prevents password autofill styling
  } else if (keyboardType === 'email-address') {
    textContentType = 'username'; // Better for email fields
  }
  
  return (
    <View style={styles.inputContainer}>
      <View style={[styles.input, error ? styles.inputError : null]}>
        {icon && <Ionicons name={icon as any} size={20} color={COLORS.textLight} style={styles.inputIcon} />}
        <TextInput
          style={[styles.textInput, rightIcon ? { paddingRight: 40 } : null]}
          placeholder={placeholder}
          placeholderTextColor="#AAAAAA"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoComplete={autoComplete as any}
          testID={testID}
          autoCorrect={false}
          textContentType={textContentType as any}
        />
        {rightIcon && (
          <TouchableOpacity 
            style={styles.rightIcon} 
            onPress={onRightIconPress}
            activeOpacity={0.7}
          >
            <Ionicons name={rightIcon as any} size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

// Auth Button
interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  secondary?: boolean;
  style?: any;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  testID,
  secondary = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        secondary ? styles.buttonSecondary : null,
        disabled || loading ? styles.buttonDisabled : null,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text 
          style={[
            styles.buttonText,
            secondary ? styles.buttonTextSecondary : null
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// Auth Footer with Text and Link
interface AuthFooterProps {
  text: string;
  linkText: string;
  onPress: () => void;
}

export const AuthFooter: React.FC<AuthFooterProps> = ({
  text,
  linkText,
  onPress,
}) => {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        {text}{' '}
        <Text style={styles.footerLink} onPress={onPress}>
          {linkText}
        </Text>
      </Text>
    </View>
  );
};

// Auth Error Message
export const AuthError: React.FC<{
  error: string | null;
  visible: boolean;
}> = ({ error, visible }) => {
  if (!visible || !error) return null;

  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={14} color={COLORS.error} />
      <Text style={styles.errorMessage}>{error}</Text>
    </View>
  );
};

// Auth Success Message
export const AuthSuccess: React.FC<{
  message: string | null;
  visible: boolean;
}> = ({ message, visible }) => {
  if (!visible || !message) return null;

  return (
    <View style={styles.successContainer}>
      <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
      <Text style={styles.successMessage}>{message}</Text>
    </View>
  );
};

// OTP Input Component
interface OTPInputProps {
  code: string;
  setCode: (text: string) => void;
  maximumLength: number;
  error?: string;
  onError?: () => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  code,
  setCode,
  maximumLength,
  error,
  onError,
}) => {
  // Create an array with the length of maximumLength
  const codeDigitsArray = new Array(maximumLength).fill(0);
  const { shakeAnimation, shake } = useShakeAnimation();

  // Handle text change
  const handleTextChange = (text: string) => {
    const validated = text.replace(/[^0-9]/g, '');
    setCode(validated.substring(0, maximumLength));
  };

  // Apply shake effect when error prop changes to a truthy value
  React.useEffect(() => {
    if (error) {
      shake();
      if (onError) onError();
    }
  }, [error]);

  return (
    <Animated.View 
      style={[
        styles.otpContainer,
        {transform: [{translateX: shakeAnimation}]}
      ]}
    >
      <View style={styles.otpInputsContainer}>
        {codeDigitsArray.map((_, index) => {
          const digit = code[index] || '';
          const isCurrentDigit = index === code.length;
          const isLastDigit = index === maximumLength - 1;
          const isCodeComplete = code.length === maximumLength;
          const isDigitFocused = isCurrentDigit || (isLastDigit && isCodeComplete);
          
          return (
            <View 
              key={index} 
              style={[
                styles.otpInputBox,
                digit ? styles.otpInputFilled : null,
                isDigitFocused ? styles.otpInputFocused : null,
                error ? styles.otpInputError : null,
              ]}
            >
              <Text style={styles.otpInputText}>{digit}</Text>
            </View>
          );
        })}
      </View>
      
      <TextInput
        style={styles.otpTextInput}
        value={code}
        onChangeText={handleTextChange}
        maxLength={maximumLength}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        returnKeyType="done"
      />
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Animated.View>
  );
};

// Checkbox Component
interface CheckboxProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  value,
  onValueChange,
}) => {
  return (
    <TouchableOpacity 
      style={styles.checkboxContainer} 
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value && (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// TextLink Component
interface TextLinkProps {
  text: string;
  onPress: () => void;
}

export const TextLink: React.FC<TextLinkProps> = ({
  text,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.textLinkContainer}>
      <Text style={styles.textLink}>{text}</Text>
    </TouchableOpacity>
  );
};

// Shake animation utility
export const useShakeAnimation = () => {
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  
  const shake = () => {
    // Reset animation value
    shakeAnimation.setValue(0);
    
    // Create sequence of left-right movements
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };
  
  return { shakeAnimation, shake };
};

// Fixed back button that stays in place while scrolling
interface FixedBackButtonProps {
  onPress: () => void;
}

export const FixedBackButton: React.FC<FixedBackButtonProps> = ({ onPress }) => {
  return (
    <View style={styles.fixedBackButton}>
      <TouchableOpacity 
        style={styles.backButtonTouchable} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={40} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 20,
  },
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 0,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logo: {
    width: 70,
    height: 70,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 4,
  },
  emailInSubtitle: {
    color: COLORS.text,
    fontWeight: '600',
  },
  // Input field styles
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  // Checkbox styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  // Text link styles
  textLinkContainer: {
    marginVertical: 6,
  },
  textLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Button styles
  button: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: COLORS.primary,
  },
  // Footer styles
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Error message styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginVertical: 8,
  },
  errorMessage: {
    color: COLORS.error,
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  // Success message styles
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(67, 160, 71, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 12,
  },
  successMessage: {
    color: COLORS.success,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  // OTP input styles
  otpContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  otpInputBox: {
    width: 50,
    height: 56,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(50, 51, 52, 0.05)',
  },
  otpInputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  otpInputError: {
    borderColor: COLORS.error,
  },
  otpInputText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
  },
  otpTextInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  rightIcon: {
    position: 'absolute',
    right: 12,
    top: 16,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Fixed back button styles
  fixedBackButton: {
    position: 'absolute',
    top: 55,
    left: 16,
    zIndex: 10,
  },
  backButtonTouchable: {
    padding: 8,
  },
});

export default {
  AuthContainer,
  AuthHeader,
  AuthInput,
  AuthButton,
  AuthFooter,
  AuthError,
  AuthSuccess,
  OTPInput,
  Checkbox,
  TextLink,
  COLORS,
  useShakeAnimation,
  FixedBackButton,
}; 