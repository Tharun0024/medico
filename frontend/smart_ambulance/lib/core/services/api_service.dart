import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

/// Central API service for all backend communication
class ApiService {
  /// Base URL from configuration
  /// Override at runtime if needed, or set via --dart-define=API_URL=http://...
  static String baseUrl = AppConfig.apiBaseUrl;

  /// JWT token stored after login
  static String? _token;
  static String? _ambulanceId;
  static String? _driverId;
  static String? _driverName;
  static String? _vehicleNumber;
  static String? _ambulanceType;

  /// Getters
  static String? get token => _token;
  static String? get ambulanceId => _ambulanceId;
  static String? get driverId => _driverId;
  static String? get driverName => _driverName;
  static String? get vehicleNumber => _vehicleNumber;
  static String? get ambulanceType => _ambulanceType;

  /// Default headers
  static Map<String, String> get _headers => {
        "Content-Type": "application/json",
        "Accept": "application/json",
        if (_token != null) "Authorization": "Bearer $_token",
      };

  /* ---------------- TOKEN MANAGEMENT ---------------- */

  static Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  static Future<void> setUserInfo({
    required String ambulanceId,
    required String driverId,
    required String driverName,
    String? vehicleNumber,
    String? ambulanceType,
  }) async {
    _ambulanceId = ambulanceId;
    _driverId = driverId;
    _driverName = driverName;
    _vehicleNumber = vehicleNumber;
    _ambulanceType = ambulanceType;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('ambulance_id', ambulanceId);
    await prefs.setString('driver_id', driverId);
    await prefs.setString('driver_name', driverName);
    if (vehicleNumber != null) await prefs.setString('vehicle_number', vehicleNumber);
    if (ambulanceType != null) await prefs.setString('ambulance_type', ambulanceType);
  }

  static Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    _ambulanceId = prefs.getString('ambulance_id');
    _driverId = prefs.getString('driver_id');
    _driverName = prefs.getString('driver_name');
    _vehicleNumber = prefs.getString('vehicle_number');
    _ambulanceType = prefs.getString('ambulance_type');
  }

  static Future<void> clearToken() async {
    _token = null;
    _ambulanceId = null;
    _driverId = null;
    _driverName = null;
    _vehicleNumber = null;
    _ambulanceType = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('ambulance_id');
    await prefs.remove('driver_id');
    await prefs.remove('driver_name');
    await prefs.remove('vehicle_number');
    await prefs.remove('ambulance_type');
  }

  static bool get isAuthenticated => _token != null;

  /// Stored credentials for auto-reauth
  static String? _savedAmbulanceId;
  static String? _savedSecret;

  static Future<void> saveCredentials(String ambulanceId, String secret) async {
    _savedAmbulanceId = ambulanceId;
    _savedSecret = secret;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('saved_ambulance_id', ambulanceId);
    await prefs.setString('saved_secret', secret);
  }

  static Future<void> loadCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    _savedAmbulanceId = prefs.getString('saved_ambulance_id');
    _savedSecret = prefs.getString('saved_secret');
  }

  /// Re-authenticate using saved credentials
  static Future<bool> _reAuthenticate() async {
    if (_savedAmbulanceId == null || _savedSecret == null) {
      await loadCredentials();
    }
    if (_savedAmbulanceId == null || _savedSecret == null) {
      print("[API] No saved credentials for re-auth");
      return false;
    }

    print("[API] Attempting re-authentication...");
    try {
      final uri = Uri.parse("$baseUrl/ambulance/register");
      final response = await http.post(
        uri,
        headers: {"Content-Type": "application/json", "Accept": "application/json"},
        body: jsonEncode({
          "ambulance_id": _savedAmbulanceId,
          "secret": _savedSecret,
        }),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await setToken(data["access_token"]);
        print("[API] Re-authentication successful");
        return true;
      }
    } catch (e) {
      print("[API] Re-auth failed: $e");
    }
    return false;
  }

  /* ---------------- GET ---------------- */

  static Future<http.Response> get(String endpoint, {bool retry = true}) async {
    final uri = Uri.parse("$baseUrl$endpoint");
    print("[API] GET $uri");

    try {
      final response = await http.get(uri, headers: _headers).timeout(
        const Duration(seconds: 15),
        onTimeout: () {
          throw Exception("Request timeout");
        },
      );
      
      // Auto re-auth on 401
      if (response.statusCode == 401 && retry) {
        print("[API] Got 401, attempting re-auth...");
        if (await _reAuthenticate()) {
          return get(endpoint, retry: false);
        }
      }
      
      _logResponse(response);
      return response;
    } catch (e) {
      print("[API] GET Error: $e");
      rethrow;
    }
  }

  /* ---------------- POST ---------------- */

  static Future<http.Response> post(
    String endpoint,
    Map<String, dynamic> body, {
    bool retry = true,
  }) async {
    final uri = Uri.parse("$baseUrl$endpoint");
    print("[API] POST $uri");

    try {
      final response = await http.post(
        uri,
        headers: _headers,
        body: jsonEncode(body),
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () {
          throw Exception("Request timeout");
        },
      );
      
      // Auto re-auth on 401 (but not for register endpoint)
      if (response.statusCode == 401 && retry && !endpoint.contains('/register')) {
        print("[API] Got 401, attempting re-auth...");
        if (await _reAuthenticate()) {
          return post(endpoint, body, retry: false);
        }
      }
      
      _logResponse(response);
      return response;
    } catch (e) {
      print("[API] POST Error: $e");
      rethrow;
    }
  }

  /* ---------------- PUT ---------------- */

  static Future<http.Response> put(
    String endpoint, [
    Map<String, dynamic>? body,
    bool retry = true,
  ]) async {
    final uri = Uri.parse("$baseUrl$endpoint");
    print("[API] PUT $uri");

    try {
      final response = await http.put(
        uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null,
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () {
          throw Exception("Request timeout");
        },
      );
      
      // Auto re-auth on 401
      if (response.statusCode == 401 && retry) {
        print("[API] Got 401, attempting re-auth...");
        if (await _reAuthenticate()) {
          return put(endpoint, body, false);
        }
      }
      
      _logResponse(response);
      return response;
    } catch (e) {
      print("[API] PUT Error: $e");
      rethrow;
    }
  }

  /* ---------------- HELPERS ---------------- */

  static void _logResponse(http.Response response) {
    final body = response.body.length > 300
        ? '${response.body.substring(0, 300)}...'
        : response.body;
    print("[API] ${response.statusCode}: $body");
  }

  /// Decode JSON safely
  static dynamic decodeResponse(http.Response response) {
    if (response.body.isEmpty) return null;
    return jsonDecode(response.body);
  }

  /// Simple success checker
  static bool isSuccess(http.Response response) {
    return response.statusCode >= 200 && response.statusCode < 300;
  }
}
