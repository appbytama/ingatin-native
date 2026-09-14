import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Camera, KeyRound } from 'lucide-react-native';
import QrScannerModal from './QrScannerModal';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

const CODE_LENGTH = 6;

// Mirrors the PWA's join-*-by-code.tsx components (identical shape across
// reminder/checklist/trip, just calling a different RPC): a dashed
// "Punya kode undangan?" trigger that expands into a code input + Gabung
// button + a "Scan QR" shortcut, instead of a getUserMedia+canvas+jsQR loop
// (native's expo-camera QrScannerModal does the actual scanning).
export default function JoinByCodeForm({
  onJoin,
  onJoined,
}: {
  onJoin: (code: string) => Promise<{ title: string }>;
  onJoined: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  async function submit(rawCode: string) {
    const trimmed = rawCode.trim().toUpperCase();
    if (trimmed.length < CODE_LENGTH || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await onJoin(trimmed);
      setOpen(false);
      setCode('');
      onJoined();
      Alert.alert('Berhasil', `Berhasil gabung ke "${result.title}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal gabung.');
    } finally {
      setPending(false);
    }
  }

  function handleScanned(scannedCode: string) {
    setScannerOpen(false);
    setCode(scannedCode.trim().toUpperCase());
    submit(scannedCode);
  }

  if (!open) {
    return (
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <KeyRound size={iconSize.sm} color={theme.color.textMuted} />
        <Text style={styles.triggerText}>Punya kode undangan? Gabung di sini</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          placeholder="Kode 6 karakter"
          placeholderTextColor={theme.color.textMuted}
          maxLength={CODE_LENGTH}
          autoCapitalize="characters"
          autoFocus
          onSubmitEditing={() => submit(code)}
        />
        <Pressable
          style={[styles.joinButton, (pending || code.trim().length < CODE_LENGTH) && styles.joinButtonDisabled]}
          onPress={() => submit(code)}
          disabled={pending || code.trim().length < CODE_LENGTH}
        >
          <Text style={styles.joinButtonText}>{pending ? '…' : 'Gabung'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.scanButton} onPress={() => setScannerOpen(true)}>
        <Camera size={14} color={theme.color.primarySoftTextStrong} />
        <Text style={styles.scanButtonText}>Scan QR</Text>
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        onPress={() => {
          setOpen(false);
          setError(null);
          setCode('');
        }}
      >
        <Text style={styles.cancelText}>Batal</Text>
      </Pressable>

      <QrScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={handleScanned} />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.xs + 2,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.color.borderDashed,
      borderRadius: radius.card,
      paddingVertical: space.sm + 2,
      marginBottom: space.md,
    },
    triggerText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    card: {
      gap: space.sm,
      borderWidth: 1,
      borderColor: theme.color.primarySoftBgMid,
      backgroundColor: theme.color.primarySoftBg,
      borderRadius: radius.card,
      padding: space.sm + 4,
      marginBottom: space.md,
    },
    row: {
      flexDirection: 'row',
      gap: space.xs + 2,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.color.primarySoftBgMid,
      backgroundColor: theme.color.surface,
      borderRadius: 8,
      paddingHorizontal: space.sm,
      paddingVertical: space.sm,
      textAlign: 'center',
      fontSize: fontSize.sm,
      fontWeight: '600',
      letterSpacing: 2,
      color: theme.color.primarySoftTextStrong,
    },
    joinButton: {
      backgroundColor: theme.color.primary,
      borderRadius: 8,
      paddingHorizontal: space.sm + 2,
      justifyContent: 'center',
    },
    joinButtonDisabled: {
      opacity: 0.5,
    },
    joinButtonText: {
      color: theme.color.onPrimary,
      fontSize: fontSize.xs,
      fontWeight: '500',
    },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.xs + 2,
      borderWidth: 1,
      borderColor: theme.color.primarySoftBgMid,
      backgroundColor: theme.color.surface,
      borderRadius: 8,
      paddingVertical: space.xs + 2,
    },
    scanButtonText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.primarySoftTextStrong,
    },
    errorText: {
      fontSize: fontSize.xs,
      color: theme.color.destructive,
    },
    cancelText: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
      textAlign: 'center',
    },
  });
}
