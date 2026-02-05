import 'package:flutter/material.dart';
import '../../features/driver/screens/login_screen.dart';
import '../../features/driver/screens/home_screen.dart';
import '../../features/driver/screens/emergency_assignment_screen.dart';
import '../../features/driver/screens/navigation_accident_screen.dart';
import '../../features/driver/screens/patient_pickup_screen.dart';
import '../../features/driver/screens/navigation_hospital_screen.dart';
import '../../features/driver/screens/trip_complete_screen.dart';
import '../../features/signal/screens/signal_corridor_screen.dart';
import '../../features/signal/screens/route_signals_screen.dart';
// Phase 1 - Static Data Screens (No backend API calls)
import '../../features/driver/screens/static_login_screen.dart';
import '../../features/driver/screens/static_dashboard_screen.dart';
import '../../features/driver/screens/static_trip_screen.dart';

/// App route names
class AppRoutes {
  AppRoutes._();

  static const String login = '/login';
  static const String home = '/home';
  static const String emergencyAssignment = '/emergency-assignment';
  static const String navigationAccident = '/navigation-accident';
  static const String patientPickup = '/patient-pickup';
  static const String navigationHospital = '/navigation-hospital';
  static const String tripComplete = '/trip-complete';
  static const String signalCorridor = '/signal-corridor';
  static const String routeSignals = '/route-signals';
  
  // Phase 1 - Static Data Routes
  static const String staticLogin = '/static-login';
  static const String staticDashboard = '/static-dashboard';
  static const String staticTrip = '/static-trip';
}

/// Route generator for the app
class AppRouter {
  AppRouter._();

  /// Generate routes based on route settings
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case AppRoutes.login:
        return MaterialPageRoute(
          builder: (_) => const LoginScreen(),
        );

      case AppRoutes.home:
        return MaterialPageRoute(
          builder: (_) => const HomeScreen(),
        );

      case AppRoutes.emergencyAssignment:
        return MaterialPageRoute(
          builder: (_) => const EmergencyAssignmentScreen(),
        );

      case AppRoutes.navigationAccident:
        return MaterialPageRoute(
          builder: (_) => const NavigationAccidentScreen(),
        );

      case AppRoutes.patientPickup:
        return MaterialPageRoute(
          builder: (_) => const PatientPickupScreen(),
        );

      case AppRoutes.navigationHospital:
        return MaterialPageRoute(
          builder: (_) => const NavigationHospitalScreen(),
        );

      case AppRoutes.tripComplete:
        return MaterialPageRoute(
          builder: (_) => const TripCompleteScreen(),
        );

      case AppRoutes.signalCorridor:
        return MaterialPageRoute(
          builder: (_) => const SignalCorridorScreen(),
        );

      case AppRoutes.routeSignals:
        return MaterialPageRoute(
          builder: (_) => const RouteSignalsScreen(),
        );

      // Phase 1 - Static Data Routes
      case AppRoutes.staticLogin:
        return MaterialPageRoute(
          builder: (_) => const StaticLoginScreen(),
        );

      case AppRoutes.staticDashboard:
        return MaterialPageRoute(
          builder: (_) => const StaticDashboardScreen(),
        );

      case AppRoutes.staticTrip:
        return MaterialPageRoute(
          builder: (_) => const StaticTripScreen(),
        );

      default:
        // Default to static login screen for Phase 1
        return MaterialPageRoute(
          builder: (_) => const StaticLoginScreen(),
        );
    }
  }
}
