import 'dart:io' show Platform;

class AppConfig {
  AppConfig._();

  /// Backend API base URL
  ///
  /// Priority:
  /// 1. --dart-define override
  /// 2. Platform-based auto detection
  static String get apiBaseUrl {
    // 1️⃣ Allow override via compile-time definition
    const overrideUrl = String.fromEnvironment(
      'API_URL',
      defaultValue: '',
    );
    if (overrideUrl.isNotEmpty) return overrideUrl;

    // 2️⃣ Auto-detect platform
    try {
      if (Platform.isAndroid) {
        // ⚠️ Emulator vs Physical device
        // Emulator → 10.0.2.2
        // Physical device → PC IP
        return _isEmulator
            ? 'http://10.0.2.2:8000'
            : 'http://10.55.110.250:8000';
      }

      if (Platform.isIOS) {
        // iOS Simulator
        return 'http://localhost:8000';
      }

      if (Platform.isWindows ||
          Platform.isLinux ||
          Platform.isMacOS) {
        // Desktop
        return 'http://localhost:8000';
      }
    } catch (_) {
      // Fallback
    }

    return 'http://localhost:8000';
  }

  /// Detect Android Emulator
  static bool get _isEmulator {
    return Platform.environment.containsKey('ANDROID_EMULATOR');
  }

  /// Polling intervals (seconds)
  static const int gpsPollingInterval = 3;
  static const int tripPollingInterval = 2;
  static const int signalPollingInterval = 3;

  /// Request timeout
  static const Duration requestTimeout = Duration(seconds: 15);

  /// Map configuration
  static const double defaultMapZoom = 14.0;
  static const double minMapZoom = 10.0;
  static const double maxMapZoom = 18.0;

  /// Chennai center coordinates
  static const double chennaiCenterLat = 13.0827;
  static const double chennaiCenterLng = 80.2707;
}
