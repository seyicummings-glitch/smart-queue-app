import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AuthView = 'login' | 'signup' | 'forgot' | 'verify' | 'email-verify';
type Language = 'en' | 'es' | 'fr' | 'de' | 'tr' | 'zh' | 'ar';

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
const translations: Record<Language, Record<string, string>> = {
  en: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    forgotPassword: 'Forgot Password',
    verifyCode: 'Verify Code',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    fullName: 'Full Name',
    rememberMe: 'Remember me',
    forgotPasswordLink: 'Forgot password?',
    signInButton: 'Sign In',
    signUpButton: 'Create Account',
    sendCode: 'Send Reset Code',
    verifyButton: 'Verify & Reset',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    backToLogin: 'Back to Login',
    demoAccounts: 'Demo Accounts',
    superAdmin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
    customer: 'Customer',
    enterCode: 'Enter the 6-digit code sent to your email',
    resendCode: 'Resend Code',
    resendIn: 'Resend in',
    seconds: 's',
    passwordStrength: 'Password Strength',
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
    selectLanguage: 'Select Language',
  },
  es: {
    signIn: 'Iniciar Sesión',
    signUp: 'Registrarse',
    forgotPassword: 'Olvidé mi Contraseña',
    verifyCode: 'Verificar Código',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    fullName: 'Nombre Completo',
    rememberMe: 'Recuérdame',
    forgotPasswordLink: '¿Olvidaste tu contraseña?',
    signInButton: 'Iniciar Sesión',
    signUpButton: 'Crear Cuenta',
    sendCode: 'Enviar Código',
    verifyButton: 'Verificar y Restablecer',
    noAccount: '¿No tienes cuenta?',
    hasAccount: '¿Ya tienes cuenta?',
    backToLogin: 'Volver al Inicio',
    demoAccounts: 'Cuentas Demo',
    superAdmin: 'Super Admin',
    admin: 'Admin',
    staff: 'Personal',
    customer: 'Cliente',
    enterCode: 'Ingresa el código de 6 dígitos enviado a tu correo',
    resendCode: 'Reenviar Código',
    resendIn: 'Reenviar en',
    seconds: 's',
    passwordStrength: 'Fortaleza de Contraseña',
    weak: 'Débil',
    fair: 'Regular',
    good: 'Buena',
    strong: 'Fuerte',
    selectLanguage: 'Seleccionar Idioma',
  },
  fr: {
    signIn: 'Se Connecter',
    signUp: "S'inscrire",
    forgotPassword: 'Mot de Passe Oublié',
    verifyCode: 'Vérifier le Code',
    email: 'Adresse Email',
    password: 'Mot de Passe',
    confirmPassword: 'Confirmer le Mot de Passe',
    fullName: 'Nom Complet',
    rememberMe: 'Se souvenir de moi',
    forgotPasswordLink: 'Mot de passe oublié ?',
    signInButton: 'Se Connecter',
    signUpButton: 'Créer un Compte',
    sendCode: 'Envoyer le Code',
    verifyButton: 'Vérifier et Réinitialiser',
    noAccount: "Pas de compte ?",
    hasAccount: 'Déjà un compte ?',
    backToLogin: 'Retour à la Connexion',
    demoAccounts: 'Comptes Démo',
    superAdmin: 'Super Admin',
    admin: 'Admin',
    staff: 'Personnel',
    customer: 'Client',
    enterCode: 'Entrez le code à 6 chiffres envoyé à votre email',
    resendCode: 'Renvoyer le Code',
    resendIn: 'Renvoyer dans',
    seconds: 's',
    passwordStrength: 'Force du Mot de Passe',
    weak: 'Faible',
    fair: 'Moyen',
    good: 'Bon',
    strong: 'Fort',
    selectLanguage: 'Choisir la Langue',
  },
  de: {
    signIn: 'Anmelden',
    signUp: 'Registrieren',
    forgotPassword: 'Passwort Vergessen',
    verifyCode: 'Code Verifizieren',
    email: 'E-Mail-Adresse',
    password: 'Passwort',
    confirmPassword: 'Passwort Bestätigen',
    fullName: 'Vollständiger Name',
    rememberMe: 'Angemeldet bleiben',
    forgotPasswordLink: 'Passwort vergessen?',
    signInButton: 'Anmelden',
    signUpButton: 'Konto Erstellen',
    sendCode: 'Code Senden',
    verifyButton: 'Verifizieren & Zurücksetzen',
    noAccount: 'Kein Konto?',
    hasAccount: 'Bereits ein Konto?',
    backToLogin: 'Zurück zur Anmeldung',
    demoAccounts: 'Demo-Konten',
    superAdmin: 'Super Admin',
    admin: 'Admin',
    staff: 'Personal',
    customer: 'Kunde',
    enterCode: 'Geben Sie den 6-stelligen Code ein, der an Ihre E-Mail gesendet wurde',
    resendCode: 'Code Erneut Senden',
    resendIn: 'Erneut in',
    seconds: 's',
    passwordStrength: 'Passwortstärke',
    weak: 'Schwach',
    fair: 'Mittel',
    good: 'Gut',
    strong: 'Stark',
    selectLanguage: 'Sprache Auswählen',
  },
  tr: {
    signIn: 'Giriş Yap',
    signUp: 'Kayıt Ol',
    forgotPassword: 'Şifremi Unuttum',
    verifyCode: 'Kodu Doğrula',
    email: 'E-posta Adresi',
    password: 'Şifre',
    confirmPassword: 'Şifreyi Onayla',
    fullName: 'Ad Soyad',
    rememberMe: 'Beni hatırla',
    forgotPasswordLink: 'Şifremi unuttum?',
    signInButton: 'Giriş Yap',
    signUpButton: 'Hesap Oluştur',
    sendCode: 'Kod Gönder',
    verifyButton: 'Doğrula ve Sıfırla',
    noAccount: 'Hesabınız yok mu?',
    hasAccount: 'Zaten hesabınız var mı?',
    backToLogin: 'Girişe Dön',
    demoAccounts: 'Demo Hesapları',
    superAdmin: 'Süper Admin',
    admin: 'Yönetici',
    staff: 'Personel',
    customer: 'Müşteri',
    enterCode: 'E-postanıza gönderilen 6 haneli kodu girin',
    resendCode: 'Kodu Yeniden Gönder',
    resendIn: 'Yeniden gönder:',
    seconds: 's',
    passwordStrength: 'Şifre Gücü',
    weak: 'Zayıf',
    fair: 'Orta',
    good: 'İyi',
    strong: 'Güçlü',
    selectLanguage: 'Dil Seçin',
  },
  zh: {
    signIn: '登录',
    signUp: '注册',
    forgotPassword: '忘记密码',
    verifyCode: '验证码',
    email: '电子邮件',
    password: '密码',
    confirmPassword: '确认密码',
    fullName: '全名',
    rememberMe: '记住我',
    forgotPasswordLink: '忘记密码？',
    signInButton: '登录',
    signUpButton: '创建账户',
    sendCode: '发送验证码',
    verifyButton: '验证并重置',
    noAccount: '没有账户？',
    hasAccount: '已有账户？',
    backToLogin: '返回登录',
    demoAccounts: '演示账户',
    superAdmin: '超级管理员',
    admin: '管理员',
    staff: '员工',
    customer: '客户',
    enterCode: '输入发送到您邮箱的6位验证码',
    resendCode: '重新发送',
    resendIn: '重新发送于',
    seconds: '秒',
    passwordStrength: '密码强度',
    weak: '弱',
    fair: '一般',
    good: '好',
    strong: '强',
    selectLanguage: '选择语言',
  },
  ar: {
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    forgotPassword: 'نسيت كلمة المرور',
    verifyCode: 'التحقق من الرمز',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    fullName: 'الاسم الكامل',
    rememberMe: 'تذكرني',
    forgotPasswordLink: 'نسيت كلمة المرور؟',
    signInButton: 'تسجيل الدخول',
    signUpButton: 'إنشاء حساب',
    sendCode: 'إرسال الرمز',
    verifyButton: 'تحقق وأعد التعيين',
    noAccount: 'ليس لديك حساب؟',
    hasAccount: 'لديك حساب بالفعل؟',
    backToLogin: 'العودة إلى تسجيل الدخول',
    demoAccounts: 'حسابات تجريبية',
    superAdmin: 'مشرف عام',
    admin: 'مشرف',
    staff: 'موظف',
    customer: 'عميل',
    enterCode: 'أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك',
    resendCode: 'إعادة إرسال الرمز',
    resendIn: 'إعادة الإرسال في',
    seconds: 'ث',
    passwordStrength: 'قوة كلمة المرور',
    weak: 'ضعيفة',
    fair: 'متوسطة',
    good: 'جيدة',
    strong: 'قوية',
    selectLanguage: 'اختر اللغة',
  },
};

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  tr: 'Türkçe',
  zh: '中文',
  ar: 'العربية',
};

// ---------------------------------------------------------------------------
// DOB Picker
// ---------------------------------------------------------------------------
const DOB_ITEM_H  = 50;
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOB_DAYS    = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const DOB_MONTHS  = MONTH_SHORT;
const DOB_YEARS   = Array.from({ length: 2050 - 1899 }, (_, i) => String(2050 - i));

type DOBPickerProps = { visible: boolean; onClose: () => void; onConfirm: (iso: string, display: string) => void };

function DOBPickerModal({ visible, onClose, onConfirm }: DOBPickerProps) {
  const [dayIdx,   setDayIdx]   = useState(0);
  const [monthIdx, setMonthIdx] = useState(0);
  const [yearIdx,  setYearIdx]  = useState(25);

  const dayRef   = useRef<ScrollView>(null);
  const monthRef = useRef<ScrollView>(null);
  const yearRef  = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      dayRef.current?.scrollTo({ y: dayIdx * DOB_ITEM_H, animated: false });
      monthRef.current?.scrollTo({ y: monthIdx * DOB_ITEM_H, animated: false });
      yearRef.current?.scrollTo({ y: yearIdx * DOB_ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [visible]);

  const scrollTo = (ref: React.RefObject<ScrollView | null>, idx: number) =>
    ref.current?.scrollTo({ y: idx * DOB_ITEM_H, animated: true });

  const clamp = (i: number, max: number) => Math.max(0, Math.min(max, i));

  const col = (
    items:    string[],
    selected: number,
    onSel:    (i: number) => void,
    ref:      React.RefObject<ScrollView | null>,
    flex:     number,
  ) => (
    <View style={{ flex, height: DOB_ITEM_H * 5, overflow: 'hidden' }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={DOB_ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: DOB_ITEM_H * 2 }}
        onMomentumScrollEnd={e => {
          const i = clamp(Math.round(e.nativeEvent.contentOffset.y / DOB_ITEM_H), items.length - 1);
          onSel(i);
        }}
        onScrollEndDrag={e => {
          const i = clamp(Math.round(e.nativeEvent.contentOffset.y / DOB_ITEM_H), items.length - 1);
          onSel(i);
        }}
      >
        {items.map((label, idx) => (
          <TouchableOpacity
            key={idx}
            style={{ height: DOB_ITEM_H, justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={0.6}
            onPress={() => { onSel(idx); scrollTo(ref, idx); }}
          >
            <Text style={[
              dobS.itemTxt,
              idx === selected && dobS.itemTxtSel,
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const handleDone = () => {
    const d   = DOB_DAYS[dayIdx];
    const m   = String(monthIdx + 1).padStart(2, '0');
    const y   = DOB_YEARS[yearIdx];
    onConfirm(`${y}-${m}-${d}`, `${d} ${MONTH_SHORT[monthIdx]} ${y}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dobS.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={dobS.sheet}>
          <View style={dobS.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={dobS.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={dobS.titleTxt}>Date of Birth</Text>
            <TouchableOpacity onPress={handleDone} activeOpacity={0.7}>
              <Text style={dobS.doneTxt}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={dobS.labelsRow}>
            <Text style={[dobS.colLbl, { flex: 1 }]}>Day</Text>
            <Text style={[dobS.colLbl, { flex: 1.8 }]}>Month</Text>
            <Text style={[dobS.colLbl, { flex: 1.4 }]}>Year</Text>
          </View>

          <View style={dobS.columnsWrap}>
            <View style={dobS.highlight} pointerEvents="none" />
            {col(DOB_DAYS,   dayIdx,   setDayIdx,   dayRef,   1  )}
            {col(DOB_MONTHS, monthIdx, setMonthIdx, monthRef, 1.8)}
            {col(DOB_YEARS,  yearIdx,  setYearIdx,  yearRef,  1.4)}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dobS = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  titleTxt:    { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cancelTxt:   { fontSize: 15, color: '#64748b', fontWeight: '500' },
  doneTxt:     { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  labelsRow:   { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12 },
  colLbl:      { textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  columnsWrap: { flexDirection: 'row', paddingHorizontal: 20, position: 'relative' },
  highlight:   { position: 'absolute', left: 20, right: 20, top: DOB_ITEM_H * 2, height: DOB_ITEM_H, backgroundColor: '#f1f5f9', borderRadius: 12 },
  itemTxt:     { fontSize: 16, color: '#cbd5e1', fontWeight: '400' },
  itemTxtSel:  { fontSize: 17, color: '#1e293b', fontWeight: '700' },
});

// ---------------------------------------------------------------------------
// Password strength helper
// ---------------------------------------------------------------------------
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (password.length === 0) return { level: 0, label: '', color: '#e2e8f0' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'weak',   color: '#e11d48' };
  if (score === 2) return { level: 2, label: 'fair',   color: '#d97706' };
  if (score === 3) return { level: 3, label: 'good',   color: '#059669' };
  return              { level: 4, label: 'strong', color: '#2563eb' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LoginScreen() {
  const router = useRouter();
  const { setRole } = useAppContext();
  const { signIn, signUp, resetPassword, verifyEmail, resendOTP } = useAuth();

  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [language, setLanguage] = useState<Language>('en');
  const [showLangModal, setShowLangModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob]               = useState('');        // ISO YYYY-MM-DD
  const [dobDisplay, setDobDisplay] = useState('');        // e.g. "15 Mar 1995"
  const [showDOBPicker, setShowDOBPicker] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot / verify countdown
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = translations[language];

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown]);

  const strength = getPasswordStrength(password);

  // ── Resolve where to navigate after login ────────────────────────────────────
  const navigateByRole = (role: string) => {
    if (role === 'superadmin' || role === 'super_admin') {
      setRole('super_admin');
      router.replace('/admin/dashboard' as any);
    } else if (role === 'admin') {
      setRole('admin');
      router.replace('/admin/dashboard' as any);
    } else if (role === 'staff') {
      setRole('staff');
      router.replace('/staff/dashboard' as any);
    } else {
      setRole('customer');
      router.replace('/customer/home' as any);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    const { error, role } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (error) {
      Alert.alert('Sign In Failed', error);
      return;
    }

    navigateByRole(role ?? 'customer');
  };

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email.trim(), password, fullName.trim(), undefined, dob || undefined);
    setSubmitting(false);

    if (error) {
      Alert.alert('Sign Up Failed', error);
      return;
    }

    setCurrentView('email-verify');
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setSubmitting(true);
    const { error } = await resetPassword(email.trim());
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
    setCountdown(60);
  };

  const handleVerify = () => {
    if (verifyCode.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit code.');
      return;
    }
    Alert.alert('Success', 'Password reset successful! Please sign in.');
    setCurrentView('login');
    setVerifyCode('');
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setSubmitting(true);
    await resetPassword(email.trim());
    setSubmitting(false);
    setCountdown(60);
    Alert.alert('Info', 'A new reset link has been sent to your email.');
  };

  const handleEmailVerify = async () => {
    if (verifyCode.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit code sent to your email.');
      return;
    }
    setSubmitting(true);
    const { error } = await verifyEmail(verifyCode);
    setSubmitting(false);
    if (error) {
      Alert.alert('Verification Failed', error);
      return;
    }
    setVerifyCode('');
    navigateByRole('customer');
  };

  // -- Render helpers --

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.logoSmall}>
        <Text style={styles.logoSmallLetter}>S</Text>
      </View>
      <Text style={styles.appTitle}>SQMS</Text>
      <Text style={styles.appSubtitle}>Smart Queue Management System</Text>
    </View>
  );

  const renderLanguagePicker = () => (
    <>
      <TouchableOpacity
        style={styles.langButton}
        onPress={() => setShowLangModal(true)}
        activeOpacity={0.75}
      >
        <MaterialIcons name="language" size={16} color="#64748b" />
        <Text style={styles.langButtonText}>{LANGUAGE_LABELS[language]}</Text>
        <MaterialIcons name="arrow-forward" size={14} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={showLangModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowLangModal(false)}
          />
          <View style={styles.langSheet}>
            <Text style={styles.langSheetTitle}>{t.selectLanguage}</Text>
            {(Object.keys(LANGUAGE_LABELS) as Language[]).map(lang => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langOption,
                  lang === language && styles.langOptionActive,
                ]}
                onPress={() => {
                  setLanguage(lang);
                  setShowLangModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.langOptionText,
                    lang === language && styles.langOptionTextActive,
                  ]}
                >
                  {LANGUAGE_LABELS[lang]}
                </Text>
                {lang === language && (
                  <MaterialIcons name="check" size={18} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );

  const renderLoginView = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t.signIn}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t.email}</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="email" size={18} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{t.password}</Text>
          <TouchableOpacity onPress={() => setCurrentView('forgot')}>
            <Text style={styles.linkText}>{t.forgotPasswordLink}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <MaterialIcons name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeButton}>
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={18}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleLogin}
        activeOpacity={0.85}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.primaryButtonText}>{t.signInButton}</Text>}
      </TouchableOpacity>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>{t.noAccount} </Text>
        <TouchableOpacity onPress={() => setCurrentView('signup')}>
          <Text style={styles.linkTextBold}>{t.signUp}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSignupView = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t.signUp}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t.fullName}</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="person" size={18} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={fullName}
            onChangeText={setFullName}
            placeholder="John Doe"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t.email}</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="email" size={18} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Date of Birth <Text style={styles.optionalTag}>(optional)</Text></Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => setShowDOBPicker(true)}
          activeOpacity={0.75}
        >
          <MaterialIcons name="cake" size={18} color="#94a3b8" style={styles.inputIcon} />
          <Text style={[styles.inputWithIcon, { paddingVertical: 12, color: dobDisplay ? '#1e293b' : '#94a3b8' }]}>
            {dobDisplay || 'Select date of birth'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={22} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <DOBPickerModal
        visible={showDOBPicker}
        onClose={() => setShowDOBPicker(false)}
        onConfirm={(iso, display) => {
          setDob(iso);
          setDobDisplay(display);
          setShowDOBPicker(false);
        }}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t.password}</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeButton}>
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={18}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>
        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthTrack}>
              {[1, 2, 3, 4].map(i => (
                <View
                  key={i}
                  style={[
                    styles.strengthSegment,
                    { backgroundColor: i <= strength.level ? strength.color : '#e2e8f0' },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: strength.color }]}>
              {strength.label ? t[strength.label as keyof typeof t] : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t.confirmPassword}</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} style={styles.eyeButton}>
            <MaterialIcons
              name={showConfirmPassword ? 'visibility' : 'visibility-off'}
              size={18}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleSignup}
        activeOpacity={0.85}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.primaryButtonText}>{t.signUpButton}</Text>}
      </TouchableOpacity>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>{t.hasAccount} </Text>
        <TouchableOpacity onPress={() => setCurrentView('login')}>
          <Text style={styles.linkTextBold}>{t.signIn}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderForgotView = () => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => setCurrentView('login')}
        activeOpacity={0.7}
      >
        <MaterialIcons name="arrow-back" size={18} color="#64748b" />
        <Text style={styles.backRowText}>{t.backToLogin}</Text>
      </TouchableOpacity>

      <Text style={styles.cardTitle}>{t.forgotPassword}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t.email}</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="email" size={18} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleSendCode}
        activeOpacity={0.85}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.primaryButtonText}>{t.sendCode}</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderEmailVerifyView = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Verify Your Email</Text>
      <Text style={styles.verifyHint}>
        We sent a 6-digit code to{'\n'}<Text style={{ fontWeight: '700', color: '#1e293b' }}>{email}</Text>
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Verification Code</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="key" size={18} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={verifyCode}
            onChangeText={setVerifyCode}
            placeholder="000000"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleEmailVerify}
        activeOpacity={0.85}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.primaryButtonText}>Verify & Continue</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.resendButton, countdown > 0 && styles.resendButtonDisabled]}
        onPress={async () => {
          if (countdown > 0) return;
          setSubmitting(true);
          await resendOTP();
          setSubmitting(false);
          setCountdown(60);
          Alert.alert('Code Sent', 'A new code has been sent to your email.');
        }}
        activeOpacity={0.7}
        disabled={countdown > 0}
      >
        <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchRow}
        onPress={() => setCurrentView('login')}
        activeOpacity={0.7}
      >
        <Text style={styles.linkText}>← Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyView = () => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => setCurrentView('forgot')}
        activeOpacity={0.7}
      >
        <MaterialIcons name="arrow-back" size={18} color="#64748b" />
        <Text style={styles.backRowText}>{t.backToLogin}</Text>
      </TouchableOpacity>

      <Text style={styles.cardTitle}>{t.verifyCode}</Text>
      <Text style={styles.verifyHint}>{t.enterCode}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t.verifyCode}</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="key" size={18} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={verifyCode}
            onChangeText={setVerifyCode}
            placeholder="000000"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleVerify} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>{t.verifyButton}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.resendButton, countdown > 0 && styles.resendButtonDisabled]}
        onPress={handleResendCode}
        activeOpacity={0.7}
        disabled={countdown > 0}
      >
        <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
          {countdown > 0
            ? `${t.resendIn} ${countdown}${t.seconds}`
            : t.resendCode}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.langRow}>
            {renderLanguagePicker()}
          </View>

          {renderHeader()}

          {currentView === 'login'        && renderLoginView()}
          {currentView === 'signup'       && renderSignupView()}
          {currentView === 'forgot'       && renderForgotView()}
          {currentView === 'verify'       && renderVerifyView()}
          {currentView === 'email-verify' && renderEmailVerifyView()}

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  kav: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bottomPad: {
    height: 40,
  },

  langRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  langSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  langSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  langOptionActive: {},
  langOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  langOptionTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },

  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoSmall: {
    width: 56,
    height: 56,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoSmallLetter: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 3,
  },
  appSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 20,
    letterSpacing: -0.3,
  },

  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginLeft: 2,
  },
  optionalTag: {
    fontSize: 11,
    fontWeight: '400',
    color: '#94a3b8',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 0,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    paddingVertical: 12,
  },
  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 10,
  },

  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  strengthTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    minWidth: 36,
    textAlign: 'right',
  },

  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  linkText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  linkTextBold: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },

  verifyHint: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 20,
    lineHeight: 20,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: -4,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  resendTextDisabled: {
    color: '#94a3b8',
  },
});
