import 'package:shared_preferences/shared_preferences.dart';
import '../data/ambulance_data.dart';
import '../models/ambulance.dart';

/// Static authentication service for Phase 1
/// Authenticates ambulance_id and secret against static ambulance_data
/// No backend API calls - purely offline authentication
class StaticAuthService {
  StaticAuthService._();

  // Session storage keys
  static const String _keyAmbulanceId = 'static_ambulance_id';
  static const String _keyPlateNumber = 'static_plate_number';
  static const String _keyHospitalId = 'static_hospital_id';
  static const String _keyAmbulanceType = 'static_ambulance_type';
  static const String _keyIsLoggedIn = 'static_is_logged_in';

  // In-memory cache of current session
  static Ambulance? _currentAmbulance;
  static bool _isLoggedIn = false;

  /// Get current logged-in ambulance
  static Ambulance? get currentAmbulance => _currentAmbulance;

  /// Check if user is authenticated
  static bool get isAuthenticated => _isLoggedIn && _currentAmbulance != null;

  /// Authenticate using ambulance_id and secret
  /// Returns Map with 'success' (bool) and 'message' (String)
  static Future<Map<String, dynamic>> login(String ambulanceId, String secret) async {
    // Validate inputs
    if (ambulanceId.trim().isEmpty) {
      return {'success': false, 'message': 'Please enter Ambulance ID'};
    }
    if (secret.trim().isEmpty) {
      return {'success': false, 'message': 'Please enter Secret'};
    }

    // Find ambulance matching credentials
    final ambulance = AmbulanceData.authenticate(
      ambulanceId.trim(),
      secret.trim(),
    );

    if (ambulance == null) {
      return {'success': false, 'message': 'Invalid Ambulance ID or Secret'};
    }

    // Check if ambulance is active
    if (!ambulance.isActive) {
      return {
        'success': false,
        'message': 'Ambulance is not active. Status: ${ambulance.status}'
      };
    }

    // Save session to SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyAmbulanceId, ambulance.ambulanceId);
      await prefs.setString(_keyPlateNumber, ambulance.plateNumber);
      await prefs.setString(_keyHospitalId, ambulance.hospitalId);
      await prefs.setString(_keyAmbulanceType, ambulance.type);
      await prefs.setBool(_keyIsLoggedIn, true);

      // Update in-memory cache
      _currentAmbulance = ambulance;
      _isLoggedIn = true;

      return {'success': true, 'message': 'Login successful'};
    } catch (e) {
      return {'success': false, 'message': 'Failed to save session: $e'};
    }
  }

  /// Logout - clear session
  static Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keyAmbulanceId);
      await prefs.remove(_keyPlateNumber);
      await prefs.remove(_keyHospitalId);
      await prefs.remove(_keyAmbulanceType);
      await prefs.setBool(_keyIsLoggedIn, false);
    } catch (_) {
      // Ignore errors during logout
    }

    // Clear in-memory cache
    _currentAmbulance = null;
    _isLoggedIn = false;
  }

  /// Load saved session from SharedPreferences
  /// Call this on app startup
  static Future<bool> loadSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isLoggedIn = prefs.getBool(_keyIsLoggedIn) ?? false;

      if (!isLoggedIn) {
        _isLoggedIn = false;
        _currentAmbulance = null;
        return false;
      }

      final ambulanceId = prefs.getString(_keyAmbulanceId);
      if (ambulanceId == null) {
        _isLoggedIn = false;
        _currentAmbulance = null;
        return false;
      }

      // Restore ambulance from static data
      final ambulance = AmbulanceData.findById(ambulanceId);
      if (ambulance == null || !ambulance.isActive) {
        // Ambulance no longer valid - clear session
        await logout();
        return false;
      }

      _currentAmbulance = ambulance;
      _isLoggedIn = true;
      return true;
    } catch (_) {
      _isLoggedIn = false;
      _currentAmbulance = null;
      return false;
    }
  }

  /// Get ambulance ID for the current session
  static String? get ambulanceId => _currentAmbulance?.ambulanceId;

  /// Get plate number for the current session
  static String? get plateNumber => _currentAmbulance?.plateNumber;

  /// Get hospital ID for the current session
  static String? get hospitalId => _currentAmbulance?.hospitalId;

  /// Get ambulance type for the current session
  static String? get ambulanceType => _currentAmbulance?.type;
}
