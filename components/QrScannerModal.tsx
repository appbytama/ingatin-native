import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { useTheme, space, fontSize, type Theme } from '../lib/theme';

// A fullscreen QR scanner, used by JoinByCodeForm as the camera-scan
// alternative to typing a code — mirrors the PWA's jsQR-based scanner in
// join-*-by-code.tsx (same "scan a bare code string, not a URL" contract).
export default function QrScannerModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  function handleBarcodeScanned(result: { data: string }) {
    if (scanned) return;
    setScanned(true);
    onScanned(result.data);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setScanned(false)}
    >
      <View style={styles.root}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Ingatin butuh akses kamera buat scan kode QR undangan.</Text>
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Izinkan kamera</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.frame} pointerEvents="none" />

        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10} accessibilityLabel="Tutup scanner">
          <X size={22} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderWidth: 2,
      borderColor: '#fff',
      borderRadius: 16,
    },
    closeButton: {
      position: 'absolute',
      top: 56,
      right: space.lg,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    permissionBox: {
      padding: space.xl,
      gap: space.md,
      alignItems: 'center',
    },
    permissionText: {
      color: '#fff',
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
    permissionButton: {
      backgroundColor: theme.color.primary,
      borderRadius: 12,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm + 2,
    },
    permissionButtonText: {
      color: theme.color.onPrimary,
      fontWeight: '600',
      fontSize: fontSize.sm,
    },
  });
}
