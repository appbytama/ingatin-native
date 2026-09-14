import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { X } from 'lucide-react-native';
import { useTheme, space, radius, fontSize, type Theme } from '../lib/theme';

// Mirrors the PWA's inline "Bagikan" panel (reminder-item-body.tsx /
// checklist-card-body.tsx / trip-detail-client.tsx all use the same shape):
// hint text, a QR code encoding the bare invite code (scanned straight into
// JoinByCodeForm's scanner, never a URL), the code itself, copy, and expiry.
// Rendered as a modal sheet here instead of an inline card since native
// screens are already tighter on vertical space than the PWA's cards.
export default function ShareInviteSheet({
  visible,
  onClose,
  hint,
  createInvite,
}: {
  visible: boolean;
  onClose: () => void;
  hint: string;
  createInvite: () => Promise<{ code: string; expiresAt: string }>;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCode(null);
      setExpiresAt(null);
      setError(null);
      setCopied(false);
      return;
    }
    createInvite()
      .then((invite) => {
        setCode(invite.code);
        setExpiresAt(invite.expiresAt);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal membuat kode undangan.'));
    // Only (re-)create an invite when the sheet opens, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function handleCopy() {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
  }

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8} accessibilityLabel="Tutup">
            <X size={18} color={theme.color.textMuted} />
          </Pressable>

          <Text style={styles.hint}>{hint}</Text>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : code ? (
            <>
              <View style={styles.qrWrap}>
                <QRCode value={code} size={144} />
              </View>
              <Text style={styles.code}>{code}</Text>
              <Pressable style={styles.copyButton} onPress={handleCopy}>
                <Text style={styles.copyButtonText}>{copied ? 'Kesalin ✓' : 'Salin kode'}</Text>
              </Pressable>
              {expiresLabel && <Text style={styles.expiry}>Sekali pakai, berlaku sampai {expiresLabel}</Text>}
            </>
          ) : (
            <Text style={styles.loadingText}>Bikin kode…</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
    },
    sheet: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: theme.color.primarySoftBg,
      borderWidth: 1,
      borderColor: theme.color.primarySoftBgMid,
      borderRadius: radius.sheet,
      padding: space.lg,
      alignItems: 'center',
      gap: space.sm + 2,
    },
    closeButton: {
      position: 'absolute',
      top: space.sm,
      right: space.sm,
      padding: space.xs,
    },
    hint: {
      fontSize: fontSize.xs,
      color: theme.color.primarySoftTextStrong,
      textAlign: 'center',
      marginTop: space.md,
    },
    qrWrap: {
      backgroundColor: '#fff',
      padding: space.sm,
      borderRadius: 12,
    },
    code: {
      fontSize: fontSize.lg + 6,
      fontWeight: '700',
      letterSpacing: 6,
      color: theme.color.primarySoftTextStrong,
    },
    copyButton: {
      backgroundColor: theme.color.primary,
      borderRadius: radius.button,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
    },
    copyButtonText: {
      color: theme.color.onPrimary,
      fontWeight: '600',
      fontSize: fontSize.sm,
    },
    expiry: {
      fontSize: fontSize.tiny,
      color: theme.color.primarySoftText,
    },
    loadingText: {
      fontSize: fontSize.xs,
      color: theme.color.primarySoftText,
    },
    errorText: {
      fontSize: fontSize.xs,
      color: theme.color.destructive,
      textAlign: 'center',
    },
  });
}
