import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/api_service.dart';
import '../../../shared/widgets/osm_navigation_map.dart';
import '../../../shared/widgets/status_chip.dart';
import '../providers/trip_provider.dart';
import '../../auth/services/auth_service.dart';

/// Home / Idle Screen for Ambulance Driver
/// Shows current status, map view, and online/offline toggle
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isToggling = false;

  @override
  void initState() {
    super.initState();
    // Initialize provider and start polling for trips
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeAndListen();
    });
  }

  Future<void> _initializeAndListen() async {
    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    
    // Auto-initialize: go online and start polling
    await tripProvider.initialize();
    
    // Listen for trip assignments and navigate
    tripProvider.addListener(() {
      if (tripProvider.hasActiveTrip && mounted) {
        _navigateBasedOnTripState(tripProvider.tripState);
      }
    });
  }

  /// Navigate to appropriate screen based on current trip state
  void _navigateBasedOnTripState(String state) {
    switch (state) {
      case 'PENDING':
      case 'ASSIGNED':
        Navigator.pushNamed(context, '/emergency-assignment');
        break;
      case 'ACCEPTED':
      case 'EN_ROUTE_TO_SCENE':
        Navigator.pushNamed(context, '/navigation-accident');
        break;
      case 'AT_SCENE':
        Navigator.pushNamed(context, '/patient-pickup');
        break;
      case 'PATIENT_ONBOARD':
      case 'EN_ROUTE_TO_HOSPITAL':
        Navigator.pushNamed(context, '/navigation-hospital');
        break;
      case 'AT_HOSPITAL':
      case 'COMPLETED':
        Navigator.pushNamed(context, '/trip-complete');
        break;
      default:
        Navigator.pushNamed(context, '/emergency-assignment');
    }
  }

  /// Toggle online/offline status
  Future<void> _toggleOnlineStatus() async {
    if (_isToggling) return;

    setState(() => _isToggling = true);

    final tripProvider = Provider.of<TripProvider>(context, listen: false);

    if (tripProvider.isOnline) {
      await tripProvider.goOffline();
    } else {
      await tripProvider.goOnline();
    }

    if (mounted) {
      setState(() => _isToggling = false);
    }
  }

  /// Handle logout
  Future<void> _handleLogout() async {
    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    tripProvider.stopAll();
    await AuthService.logout();
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TripProvider>(
      builder: (context, tripProvider, child) {
        final isOnline = tripProvider.isOnline;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Ambulance Status'),
            automaticallyImplyLeading: false,
            actions: [
              // Signal Corridor button
              IconButton(
                icon: const Icon(Icons.traffic),
                onPressed: () => Navigator.pushNamed(context, '/signal-corridor'),
                tooltip: 'Signal Corridor',
              ),
              IconButton(
                icon: const Icon(Icons.logout),
                onPressed: _handleLogout,
                tooltip: 'Logout',
              ),
            ],
          ),
          body: Column(
            children: [
              // Status section
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                color: AppColors.white,
                child: Column(
                  children: [
                    // Status chip
                    StatusChip(isAvailable: isOnline),

                    const SizedBox(height: 16),

                    // Status text
                    Text(
                      isOnline
                          ? 'Waiting for emergency assignment...'
                          : 'You are currently offline',
                      style: TextStyle(
                        fontSize: 15,
                        color: AppColors.text.withOpacity(0.7),
                      ),
                      textAlign: TextAlign.center,
                    ),

                    // Online indicator animation
                    if (isOnline) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Listening for emergencies',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Map view (expanded)
              Expanded(
                child: Stack(
                  children: [
                    OSMNavigationMap(
                      ambulanceLat: 13.0627,
                      ambulanceLng: 80.2157,
                      tripState: 'IDLE',
                      showRoute: false,
                    ),
                    // Info card overlay
                    Positioned(
                      bottom: 20,
                      left: 20,
                      right: 20,
                      child: _buildInfoCard(),
                    ),
                  ],
                ),
              ),

              // Bottom toggle button
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: SafeArea(
                  top: false,
                  child: SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isToggling ? null : _toggleOnlineStatus,
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            isOnline ? AppColors.error : AppColors.available,
                        foregroundColor: AppColors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: _isToggling
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                color: AppColors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  isOnline ? Icons.power_off : Icons.power,
                                  size: 24,
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  isOnline ? 'Go Offline' : 'Go Online',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Build ambulance info card
  Widget _buildInfoCard() {
    final vehicleNo = ApiService.vehicleNumber ?? 'Unknown';
    final ambulanceType = ApiService.ambulanceType ?? 'ALS';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.local_shipping,
              color: AppColors.primary,
              size: 28,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Ambulance $vehicleNo',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$ambulanceType Unit',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.text.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
