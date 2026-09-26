import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

export default function AuthModal({
  visible,
  onClose,
  currentUser,
  storesCount = 0,
  onLogin,
  onRegister,
  onLogout,
  onSyncData,
  lastSyncTime,
  onChangePassword,
  onForgotPassword,
  onVerifyAndResetPassword,
  onDeleteAccount,
  onSendVerificationEmail,
  onVerifyEmailOtp,
}) {
  // Modes: 'login' | 'register' | 'forgot' | 'verify_reset' | 'verify_email' | 'change_password' | 'delete_confirm'
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const [timeAgo, setTimeAgo] = useState('Not synced yet');

  useEffect(() => {
    if (!lastSyncTime) {
      setTimeAgo('Not synced yet');
      return;
    }

    const calculateTimeAgo = () => {
      const now = new Date();
      const past = new Date(lastSyncTime);
      const diffInSeconds = Math.floor((now - past) / 1000);

      if (diffInSeconds < 5) {
        setTimeAgo('Just now');
      } else if (diffInSeconds < 60) {
        setTimeAgo(`${diffInSeconds}s ago`);
      } else if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        setTimeAgo(`${mins}m ago`);
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimeAgo(`${hours}h ago`);
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        setTimeAgo(`${days}d ago`);
      }
    };

    calculateTimeAgo();
    const interval = setInterval(calculateTimeAgo, 5000);
    return () => clearInterval(interval);
  }, [lastSyncTime, visible]);

  const isValidEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleStartEmailVerification = async () => {
    if (!currentUser?.email) return;
    setIsSendingCode(true);
    const sent = await onSendVerificationEmail(currentUser.email);
    setIsSendingCode(false);
    if (sent) {
      setOtpCode('');
      setAuthMode('verify_email');
    }
  };

  const handleConfirmEmailVerification = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsSubmitting(true);
    const success = await onVerifyEmailOtp(currentUser.email, otpCode.trim());
    setIsSubmitting(false);

    if (success) {
      setAuthMode('login');
      setOtpCode('');
    }
  };

  const handleAuthSubmit = async () => {
    const cleanEmail = email.trim();
    const cleanName = name.trim();

    // 1. CHANGE PASSWORD
    if (authMode === 'change_password') {
      if (!currentPasswordInput) {
        Alert.alert('Missing Field', 'Please enter your current password.');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Weak Password', 'New password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'New Password and Confirm Password do not match.');
        return;
      }

      setIsSubmitting(true);
      const success = await onChangePassword(currentPasswordInput, password);
      setIsSubmitting(false);

      if (success) {
        setCurrentPasswordInput('');
        setPassword('');
        setConfirmPassword('');
        setAuthMode('login');
      }
      return;
    }

    // 2. DELETE ACCOUNT CONFIRMATION
    if (authMode === 'delete_confirm') {
      if (!deletePassword) {
        Alert.alert('Password Required', 'Please enter your password to confirm account deletion.');
        return;
      }

      setIsSubmitting(true);
      const success = await onDeleteAccount(deletePassword);
      setIsSubmitting(false);

      if (success) {
        setDeletePassword('');
        setAuthMode('login');
      }
      return;
    }

    // 3. FORGOT PASSWORD (STEP 1)
    if (authMode === 'forgot') {
      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address to receive your recovery code.');
        return;
      }

      setIsSubmitting(true);
      const success = await onForgotPassword(cleanEmail);
      setIsSubmitting(false);

      if (success) {
        setAuthMode('verify_reset');
        setPassword('');
        setConfirmPassword('');
      }
      return;
    }

    // 4. VERIFY OTP & RESET PASSWORD (STEP 2)
    if (authMode === 'verify_reset') {
      if (!otpCode.trim() || otpCode.trim().length < 6) {
        Alert.alert('Invalid Code', 'Please enter the 6-digit verification code sent to your email.');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'New Password and Confirm Password do not match.');
        return;
      }

      setIsSubmitting(true);
      const success = await onVerifyAndResetPassword(cleanEmail, otpCode.trim(), password);
      setIsSubmitting(false);

      if (success) {
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
      }
      return;
    }

    // 5. COMMON VALIDATION FOR LOGIN & REGISTER
    if (!cleanEmail) {
      Alert.alert('Missing Field', 'Please enter your email address.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      Alert.alert('Missing Field', 'Please enter your password.');
      return;
    }

    // 6. REGISTRATION
    if (authMode === 'register') {
      if (!cleanName || cleanName.length < 2) {
        Alert.alert('Invalid Name', 'Please enter your full name (minimum 2 characters).');
        return;
      }

      if (password.length < 8) {
        Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return;
      }

      setIsSubmitting(true);
      await onRegister({ name: cleanName, email: cleanEmail, password });
      setIsSubmitting(false);
    } else {
      // 7. LOGIN
      setIsSubmitting(true);
      await onLogin({ email: cleanEmail, password });
      setIsSubmitting(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    await onSyncData();
    setIsSyncing(false);
  };

  const getModalTitle = () => {
    if (authMode === 'delete_confirm') return '⚠️ Confirm Deletion';
    if (authMode === 'verify_email') return '✉️ Verify Email Address';
    if (authMode === 'change_password') return '🔑 Change Password';
    if (currentUser) return 'Cloud Account Profile';
    if (authMode === 'login') return 'Cloud Sign In';
    if (authMode === 'register') return 'Create Account';
    if (authMode === 'forgot') return 'Reset Password';
    if (authMode === 'verify_reset') return 'Enter Recovery Code';
    return 'Authentication';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{getModalTitle()}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* VIEW 1: CHANGE PASSWORD IN-APP */}
          {authMode === 'change_password' ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.infoText}>
                Update your account password. Enter your current password for security verification.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CURRENT PASSWORD *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  autoCapitalize="none"
                  value={currentPasswordInput}
                  onChangeText={setCurrentPasswordInput}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  NEW PASSWORD * <Text style={styles.hint}>(Min. 8 chars)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CONFIRM NEW PASSWORD *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.btnCancelDelete}
                  onPress={() => {
                    setAuthMode('login');
                    setCurrentPasswordInput('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.btnCancelDeleteText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnConfirmDelete, { backgroundColor: '#0284C7' }]}
                  activeOpacity={0.8}
                  onPress={handleAuthSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.btnConfirmDeleteText}>Update Password ✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : authMode === 'delete_confirm' ? (
            /* VIEW 2: DELETE ACCOUNT CONFIRMATION */
            <View style={{ paddingVertical: 8 }}>
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Permanent Cloud Reset</Text>
                <Text style={styles.warningDesc}>
                  This action will permanently purge all stores, items, sales, and backups associated with this account from Supabase Cloud.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ENTER PASSWORD TO CONFIRM *</Text>
                <TextInput
                  style={[styles.input, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  autoCapitalize="none"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  autoFocus
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.btnCancelDelete}
                  onPress={() => {
                    setAuthMode('login');
                    setDeletePassword('');
                  }}
                >
                  <Text style={styles.btnCancelDeleteText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnConfirmDelete}
                  activeOpacity={0.8}
                  onPress={handleAuthSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.btnConfirmDeleteText}>Delete Cloud Data 🗑️</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : authMode === 'verify_email' ? (
            /* VIEW 3: VERIFY EMAIL OTP INPUT */
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.infoText}>
                We sent a 6-digit confirmation code to{' '}
                <Text style={{ color: '#38BDF8', fontWeight: '700' }}>{currentUser?.email}</Text>. Enter the code below to verify your email.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>6-DIGIT CONFIRMATION CODE *</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="123456"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={styles.btnSubmit}
                activeOpacity={0.8}
                onPress={handleConfirmEmailVerification}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnSubmitText}>Verify Email ✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnToggleMode, { marginTop: 12 }]}
                onPress={() => setAuthMode('login')}
              >
                <Text style={styles.toggleText}>Cancel and return to <Text style={styles.toggleHighlight}>Profile</Text></Text>
              </TouchableOpacity>
            </View>
          ) : currentUser ? (
            /* VIEW 4: LOGGED-IN ENHANCED PROFILE VIEW */
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.userProfileBanner}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '👤'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{currentUser.name || 'Store Owner'}</Text>
                  <Text style={styles.profileEmail}>{currentUser.email}</Text>
                  <Text style={styles.syncStatusText}>
                    🟢 Last sync: {isSyncing ? 'Syncing...' : timeAgo}
                  </Text>
                </View>
              </View>

              {/* QUICK STATS CHIPS */}
              <View style={styles.statsCardRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statChipLabel}>LOCAL STORES</Text>
                  <Text style={styles.statChipVal}>{storesCount}</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipLabel}>SYNC STATUS</Text>
                  <Text style={[styles.statChipVal, { color: '#34D399', fontSize: 13 }]}>Enabled</Text>
                </View>
              </View>

              {/* EMAIL VERIFICATION CALLOUT */}
              {!currentUser.isEmailVerified ? (
                <View style={styles.verifyWarningCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifyWarningTitle}>⚠️ Email Unverified</Text>
                    <Text style={styles.verifyWarningDesc}>
                      Verify your email to guarantee account recovery if you forget your password.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.btnVerifyNow}
                    activeOpacity={0.8}
                    onPress={handleStartEmailVerification}
                    disabled={isSendingCode}
                  >
                    {isSendingCode ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.btnVerifyNowText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.verifiedBadgeRow}>
                  <Text style={styles.verifiedBadgeText}>🛡️ Email Verified • Account Recovery Active</Text>
                </View>
              )}

              {/* ACTIONS */}
              <TouchableOpacity
                style={styles.btnSync}
                activeOpacity={0.8}
                onPress={handleTriggerSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnSyncText}>☁️ Sync Data to Cloud</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnChangePasswordRow}
                onPress={() => {
                  setPassword('');
                  setConfirmPassword('');
                  setCurrentPasswordInput('');
                  setAuthMode('change_password');
                }}
              >
                <Text style={styles.btnChangePasswordRowText}>🔑 Change Password</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnLogout} onPress={onLogout}>
                <Text style={styles.btnLogoutText}>Sign Out from Device</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnDeleteAccount}
                onPress={() => setAuthMode('delete_confirm')}
              >
                <Text style={styles.btnDeleteAccountText}>⚠️ Delete Cloud Backup & Data</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* VIEW 5: AUTH FORM (LOGIN / REGISTER / FORGOT / VERIFY_RESET) */
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.infoText}>
                {authMode === 'forgot'
                  ? 'Enter your registered email address and we will send you a 6-digit recovery code.'
                  : authMode === 'verify_reset'
                  ? `Check your email (${email}) for the 6-digit code and set a new password.`
                  : 'Sign in to automatically back up your stores, inventory, sales, and debts to the cloud.'}
              </Text>

              {authMode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>FULL NAME *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Alex Santos"
                    placeholderTextColor="#64748B"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              )}

              {authMode !== 'verify_reset' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., store@example.com"
                    placeholderTextColor="#64748B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              )}

              {authMode === 'verify_reset' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>6-DIGIT RECOVERY CODE *</Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="123456"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    autoFocus
                  />
                </View>
              )}

              {authMode !== 'forgot' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {authMode === 'verify_reset' ? 'NEW PASSWORD *' : 'PASSWORD *'}{' '}
                    {(authMode === 'register' || authMode === 'verify_reset') && (
                      <Text style={styles.hint}>(Min. 8 chars)</Text>
                    )}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              )}

              {(authMode === 'register' || authMode === 'verify_reset') && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CONFIRM PASSWORD *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    autoCapitalize="none"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              )}

              {authMode === 'login' && (
                <TouchableOpacity
                  style={styles.btnForgotPassword}
                  onPress={() => {
                    setAuthMode('forgot');
                    setPassword('');
                  }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.btnSubmit}
                activeOpacity={0.8}
                onPress={handleAuthSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnSubmitText}>
                    {authMode === 'login'
                      ? 'Sign In 🚀'
                      : authMode === 'register'
                      ? 'Create Account 🚀'
                      : authMode === 'forgot'
                      ? 'Send Recovery Code 📩'
                      : 'Save New Password ✓'}
                  </Text>
                )}
              </TouchableOpacity>

              {authMode === 'login' && (
                <TouchableOpacity
                  style={styles.btnToggleMode}
                  onPress={() => {
                    setAuthMode('register');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.toggleText}>Don't have an account? <Text style={styles.toggleHighlight}>Sign up</Text></Text>
                </TouchableOpacity>
              )}

              {authMode === 'register' && (
                <TouchableOpacity
                  style={styles.btnToggleMode}
                  onPress={() => {
                    setAuthMode('login');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.toggleText}>Already have an account? <Text style={styles.toggleHighlight}>Sign in</Text></Text>
                </TouchableOpacity>
              )}

              {(authMode === 'forgot' || authMode === 'verify_reset') && (
                <TouchableOpacity
                  style={styles.btnToggleMode}
                  onPress={() => {
                    setAuthMode('login');
                    setPassword('');
                    setConfirmPassword('');
                    setOtpCode('');
                  }}
                >
                  <Text style={styles.toggleText}>Back to <Text style={styles.toggleHighlight}>Sign In</Text></Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  hint: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#070B14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
  },
  otpInput: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: '#38BDF8',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  btnForgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 14,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  btnSubmit: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnToggleMode: {
    marginTop: 14,
    marginBottom: 6,
    alignItems: 'center',
  },
  toggleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  toggleHighlight: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  userProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#070B14',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  profileEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  syncStatusText: {
    fontSize: 11,
    color: '#34D399',
    marginTop: 4,
    fontWeight: '600',
  },
  statsCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#070B14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statChipLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statChipVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  verifyWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  verifyWarningTitle: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  verifyWarningDesc: {
    color: '#CBD5E1',
    fontSize: 10,
    lineHeight: 14,
  },
  btnVerifyNow: {
    backgroundColor: '#D97706',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnVerifyNowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  verifiedBadgeRow: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  verifiedBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  btnSync: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnSyncText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnChangePasswordRow: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnChangePasswordRowText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  btnLogout: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  btnLogoutText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  btnDeleteAccount: {
    marginTop: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  btnDeleteAccountText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningTitle: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  warningDesc: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  btnCancelDelete: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelDeleteText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  btnConfirmDelete: {
    flex: 1.5,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnConfirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});