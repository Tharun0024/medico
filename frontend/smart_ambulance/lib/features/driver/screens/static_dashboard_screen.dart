import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/services/static_auth_service.dart';
import '../../auth/services/static_trip_service.dart';
import '../../auth/models/trip.dart';

/// Dashboard Screen for Ambulance (Phase 1 - Static Data)
/// Displays ambulance details after login
/// Includes offline/online toggle for traffic simulation
class StaticDashboardScreen extends StatefulWidget {
  const StaticDashboardScreen({super.key});

  @override
  State<StaticDashboardScreen> createState() => _StaticDashboardScreenState();
}

class _StaticDashboardScreenState extends State<StaticDashboardScreen> {
  bool _isOnline = false;

  @override
  void initState() {
    super.initState();
    _isOnline = StaticTripService.isOnline;
  }

  /// Toggle online/offline status
  void _toggleOnlineStatus() {
    setState(() {
      _isOnline = !_isOnline;
      StaticTripService.setOnline(_isOnline);
    });

    // Show snackbar with status
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(StaticTripService.onlineStatusText),
        backgroundColor: _isOnline ? AppColors.available : AppColors.text,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  /// Handle logout
  Future<void> _handleLogout() async {
    await StaticAuthService.logout();
    StaticTripService.resetTrip();
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/static-login');
    }
  }

  /// Navigate to trip screen
  void _viewTrip() {
    Navigator.pushNamed(context, '/static-trip');
  }

  @override
  Widget build(BuildContext context) {
    final ambulance = StaticAuthService.currentAmbulance;
    final trip = StaticTripService.getCurrentTrip();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Dashboard'),
        automaticallyImplyLeading: false,
        actions: [
          // Online/Offline toggle
          _buildOnlineToggle(),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: ambulance == null
          ? const Center(child: Text('Not authenticated'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Ambulance Info Card
                  _buildAmbulanceCard(ambulance),

                  const SizedBox(height: 20),

                  // Online Status Banner
                  _buildOnlineStatusBanner(),

                  const SizedBox(height: 20),

                  // Current Trip Section
                  if (trip != null) ...[
                    _buildSectionTitle('Active Trip'),
                    const SizedBox(height: 12),
                    _buildTripCard(trip),
                  ] else ...[
                    _buildSectionTitle('Status'),
                    const SizedBox(height: 12),
                    _buildNoTripCard(),
                  ],

                  const SizedBox(height: 20),

                  // Quick Stats
                  _buildSectionTitle('Ambulance Details'),
                  const SizedBox(height: 12),
                  _buildStatsGrid(ambulance),
                ],
              ),
            ),
    );
  }

  /// Online/Offline toggle button in AppBar
  Widget _buildOnlineToggle() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: _isOnline 
            ? AppColors.available.withOpacity(0.2) 
            : AppColors.text.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: InkWell(
        onTap: _toggleOnlineStatus,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _isOnline ? Icons.cloud_done : Icons.cloud_off,
                size: 18,
                color: _isOnline ? AppColors.available : AppColors.text,
              ),
              const SizedBox(width: 6),
              Text(
                _isOnline ? 'Online' : 'Offline',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: _isOnline ? AppColors.available : AppColors.text,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Ambulance information card
  Widget _buildAmbulanceCard(ambulance) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.local_hospital,
              color: AppColors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ambulance.ambulanceId,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  ambulance.plateNumber,
                  style: TextStyle(
                    color: AppColors.white.withOpacity(0.9),
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    ambulance.typeDescription,
                    style: const TextStyle(
                      color: AppColors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.available,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'ACTIVE',
              style: TextStyle(
                color: AppColors.white,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Online status banner
  Widget _buildOnlineStatusBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _isOnline 
            ? AppColors.available.withOpacity(0.1)
            : AppColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isOnline 
              ? AppColors.available.withOpacity(0.3)
              : AppColors.warning.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            _isOnline ? Icons.wifi : Icons.wifi_off,
            color: _isOnline ? AppColors.available : AppColors.warning,
            size: 22,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isOnline ? 'Live Traffic Mode' : 'Fallback Mode',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: _isOnline ? AppColors.available : AppColors.warning,
                  ),
                ),
                Text(
                  StaticTripService.onlineStatusText,
                  style: TextStyle(
                    fontSize: 12,
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

  /// Section title
  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: AppColors.text,
      ),
    );
  }

  /// Active trip card
  Widget _buildTripCard(Trip trip) {
    return GestureDetector(
      onTap: _viewTrip,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      trip.status.icon,
                      style: const TextStyle(fontSize: 18),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      trip.tripId,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(trip.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    trip.status.displayName,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: _getStatusColor(trip.status),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),
            
            // Patient info
            Row(
              children: [
                const Icon(Icons.person, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  trip.patient.name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                Text(
                  trip.patient.severityLevel,
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 8),
            
            // Hospital
            Row(
              children: [
                const Icon(Icons.local_hospital, size: 18, color: AppColors.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    trip.hospitalName,
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.text.withOpacity(0.7),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            
            // ETA
            Row(
              children: [
                const Icon(Icons.access_time, size: 18, color: AppColors.warning),
                const SizedBox(width: 8),
                Text(
                  'ETA: ${trip.eta ?? "Calculating..."}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),
            
            // View Details Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _viewTrip,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('View Trip Details'),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward, size: 18),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// No active trip card
  Widget _buildNoTripCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            Icons.hourglass_empty,
            size: 48,
            color: AppColors.text.withOpacity(0.3),
          ),
          const SizedBox(height: 12),
          Text(
            'No Active Trip',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.text.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _isOnline 
                ? 'Waiting for emergency assignment...'
                : 'Go online to receive assignments',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.text.withOpacity(0.5),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  /// Stats grid
  Widget _buildStatsGrid(ambulance) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Hospital',
            ambulance.hospitalId,
            Icons.business,
            AppColors.primary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Type',
            ambulance.type,
            Icons.medical_services,
            AppColors.error,
          ),
        ),
      ],
    );
  }

  /// Individual stat card
  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 12),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.text.withOpacity(0.5),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.text,
            ),
          ),
        ],
      ),
    );
  }

  /// Get color for trip status
  Color _getStatusColor(TripStatus status) {
    switch (status) {
      case TripStatus.assigned:
        return AppColors.warning;
      case TripStatus.enRoute:
        return AppColors.primary;
      case TripStatus.arrived:
        return AppColors.available;
      case TripStatus.patientOnboard:
        return AppColors.error;
      case TripStatus.completed:
        return AppColors.available;
      case TripStatus.cancelled:
        return AppColors.text;
    }
  }
}
