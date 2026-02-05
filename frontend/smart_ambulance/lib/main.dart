import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/routes/app_router.dart';
import 'core/services/api_service.dart';
import 'features/driver/providers/trip_provider.dart';
import 'features/auth/services/static_auth_service.dart';

/// Entry point for the Smart Ambulance Routing System app
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load any saved authentication token (for backend mode)
  await ApiService.loadToken();
  
  // Load static auth session (for Phase 1 offline mode)
  await StaticAuthService.loadSession();

  // Set preferred orientations (portrait only for mobile demo)
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const SmartAmbulanceApp());
}

/// Root widget for the Smart Ambulance app
class SmartAmbulanceApp extends StatelessWidget {
  const SmartAmbulanceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => TripProvider(),
      child: MaterialApp(
        // App configuration
        title: 'Smart Ambulance',
        debugShowCheckedModeBanner: false,

        // Material 3 theme with custom color palette
        theme: AppTheme.lightTheme,

        // Route configuration
        // Backend-connected mode (default)
        // Use '/static-login' for demo/offline mode
        initialRoute: ApiService.isAuthenticated 
            ? '/home' 
            : '/login',
        onGenerateRoute: AppRouter.generateRoute,
      ),
    );
  }
}
