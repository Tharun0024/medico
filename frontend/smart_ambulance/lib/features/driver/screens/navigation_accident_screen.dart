import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:ui';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/osm_navigation_map.dart';
import '../providers/trip_provider.dart';

/// Navigation to Accident Location Screen
/// Full-screen map with route, ETA countdown, and status text
class NavigationAccidentScreen extends StatefulWidget {
  const NavigationAccidentScreen({super.key});

  @override
  State<NavigationAccidentScreen> createState() =>
      _NavigationAccidentScreenState();
}

class _NavigationAccidentScreenState extends State<NavigationAccidentScreen> {
  late int _etaSeconds;
  late int _initialEtaSeconds;
  late double _initialDistance;
  Timer? _timer;
  bool _isArriving = false;
  bool _initialized = false;

  // Ambulance and patient coordinates
  double _ambulanceLat = 13.0750;
  double _ambulanceLng = 80.2300;
  double _patientLat = 13.0827;
  double _patientLng = 80.2357;

  // Store start positions for smooth animation
  late double _startAmbulanceLat;
  late double _startAmbulanceLng;

  @override
  void initState() {
    super.initState();
    _initializeFromTrip();
  }

  void _initializeFromTrip() {
    if (_initialized) return; // Only initialize once
    _initialized = true;

    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    final trip = tripProvider.activeTrip;

    // Set defaults first
    _etaSeconds = 45; // 45 seconds for smooth demo
    _initialDistance = 2.5;

    if (trip != null) {
      // Use actual ETA from trip (in seconds) - clamp for demo (30-60 seconds)
      final actualEtaSeconds = (trip.etaToScene ?? 180).round();
      _etaSeconds = actualEtaSeconds > 0 ? actualEtaSeconds.clamp(30, 60) : 45;

      // Use actual distance from trip or calculate
      if (trip.distanceToSceneKm > 0) {
        _initialDistance = trip.distanceToSceneKm.clamp(0.5, 5.0);
      }

      // Use actual patient coordinates from emergency
      if (trip.emergency != null) {
        _patientLat = trip.emergency!.locationLat;
        _patientLng = trip.emergency!.locationLng;
        // Calculate ambulance start position (offset from patient for animation)
        _ambulanceLat = _patientLat - 0.012;
        _ambulanceLng = _patientLng - 0.008;
      }
    }

    // Store initial values (never change these)
    _initialEtaSeconds = _etaSeconds;
    _startAmbulanceLat = _ambulanceLat;
    _startAmbulanceLng = _ambulanceLng;

    // Start countdown after initialization
    _startEtaCountdown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  /// Start ETA countdown with smooth position updates (~8 Hz for fluid animation)
  void _startEtaCountdown() {
    const tickMs = 120;
    var elapsedMs = 0;

    _timer = Timer.periodic(Duration(milliseconds: tickMs), (timer) {
      if (_etaSeconds <= 0 && !_isArriving) {
        _isArriving = true;
        _handleArrival();
        return;
      }

      elapsedMs += tickMs;
      final totalMs = _initialEtaSeconds * 1000;
      final progress = (elapsedMs / totalMs).clamp(0.0, 1.0);

      if (progress >= 1.0) {
        _etaSeconds = 0;
      } else {
        _etaSeconds = _initialEtaSeconds - (elapsedMs ~/ 1000);
      }

      // Update position frequently - OSMNavigationMap smooth controller interpolates
      setState(() {
        _ambulanceLat = _startAmbulanceLat +
            (_patientLat - _startAmbulanceLat) * progress;
        _ambulanceLng = _startAmbulanceLng +
            (_patientLng - _startAmbulanceLng) * progress;
      });
    });
  }

  Future<void> _handleArrival() async {
    _timer?.cancel();
    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    await tripProvider.arriveAtScene();
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/patient-pickup');
    }
  }

  /// Format seconds to MM:SS
  String _formatEta(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    // Use listen: false to prevent rebuilds from TripProvider polling
    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    final trip = tripProvider.activeTrip;
    final location = trip?.emergency?.locationAddress ?? 'Accident Location';

    return Scaffold(
      // Route Signals FAB
      floatingActionButton: FloatingActionButton.small(
        onPressed: () => Navigator.pushNamed(context, '/route-signals'),
        backgroundColor: AppColors.primary,
        tooltip: 'Route Signals',
        child: const Icon(Icons.traffic, color: Colors.white),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.startTop,
      body: Stack(
        children: [
          // Full-screen OpenStreetMap navigation
          OSMNavigationMap(
            ambulanceLat: _ambulanceLat,
            ambulanceLng: _ambulanceLng,
            patientLat: _patientLat,
            patientLng: _patientLng,
            hospitalLat: 13.0547,
            hospitalLng: 80.2526,
            destinationName: location,
            showRoute: true,
            isGreenCorridor: true,
            tripState: 'EN_ROUTE_TO_PATIENT',
            prioritySignalIds: const ['SIG-001', 'SIG-003'],
          ),

          // Top status bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 12,
                bottom: 16,
                left: 20,
                right: 20,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppColors.accent,
                    AppColors.accent.withOpacity(0.8),
                  ],
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.navigation,
                      color: AppColors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Heading to Accident Location',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.white,
                          ),
                        ),
                        Text(
                          location,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ETA display card
          Positioned(
            bottom: MediaQuery.of(context).padding.bottom + 24,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.15),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      // Distance section
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Distance',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: AppColors.text.withOpacity(0.6),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${(_initialDistance * _etaSeconds / _initialEtaSeconds).toStringAsFixed(1)} km',
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: AppColors.text,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // ETA section
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 16,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.accent.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            Text(
                              'ETA',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.accent,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _formatEta(_etaSeconds),
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: AppColors.accent,
                                fontFeatures: [FontFeature.tabularFigures()],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  // Progress bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: 1.0 - (_etaSeconds / _initialEtaSeconds),
                      backgroundColor: AppColors.secondary.withOpacity(0.15),
                      valueColor:
                          const AlwaysStoppedAnimation<Color>(AppColors.accent),
                      minHeight: 10,
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Destination label
                  Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        size: 16,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          location,
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.text.withOpacity(0.7),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
