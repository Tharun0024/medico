import 'dart:convert';
import '../../../core/services/api_service.dart';

/// Handles authentication-related API calls
class AuthService {
  /// Login using ambulance_id & secret (per FastAPI backend)
  /// Returns Map with 'success' (bool) and optional 'message' (String)
  static Future<Map<String, dynamic>> login(String ambulanceId, String secret) async {
    try {
      // Save credentials for auto-reauth
      await ApiService.saveCredentials(ambulanceId, secret);
      
      // Backend uses /ambulance/register with ambulance_id + secret
      final response = await ApiService.post(
        "/ambulance/register",
        {
          "ambulance_id": ambulanceId,
          "secret": secret,
        },
        retry: false, // Don't retry on register endpoint
      );

      if (ApiService.isSuccess(response)) {
        final data = jsonDecode(response.body);
        
        // Save JWT token
        await ApiService.setToken(data["access_token"]);
        
        // Fetch ambulance info from /ambulance/me
        final meResponse = await ApiService.get("/ambulance/me");
        if (ApiService.isSuccess(meResponse)) {
          final meData = jsonDecode(meResponse.body);
          
          await ApiService.setUserInfo(
            ambulanceId: meData["id"],
            driverId: meData["id"], // Same as ambulance ID for now
            driverName: "Driver ${meData["id"]}",
            vehicleNumber: meData["plate_number"],
            ambulanceType: "ALS", // Could be fetched from backend if available
          );
          
          return {'success': true, 'message': 'Login successful'};
        }
        
        // Fallback if /me fails
        await ApiService.setUserInfo(
          ambulanceId: ambulanceId,
          driverId: ambulanceId,
          driverName: "Driver $ambulanceId",
        );
        
        return {'success': true, 'message': 'Login successful'};
      }

      // Handle error responses
      try {
        final errorData = jsonDecode(response.body);
        return {'success': false, 'message': errorData['detail'] ?? 'Invalid credentials'};
      } catch (_) {
        return {'success': false, 'message': 'Invalid credentials'};
      }
    } catch (e) {
      print("Login error: $e");
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  /// Logout (clear token)
  static Future<void> logout() async {
    await ApiService.clearToken();
  }

  /// Check if user is logged in
  static bool isAuthenticated() {
    return ApiService.isAuthenticated;
  }
  
  /// Load saved session
  static Future<bool> loadSession() async {
    await ApiService.loadToken();
    await ApiService.loadCredentials();
    return ApiService.isAuthenticated;
  }
}
