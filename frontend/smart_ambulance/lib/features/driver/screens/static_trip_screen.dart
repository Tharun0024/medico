import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/services/static_trip_service.dart';
import '../../auth/models/trip.dart';

/// Trip Screen for Patient details, journey timeline, and route-change simulation
/// Phase 1 - Static Data Only (No maps, no routing visualization)
class StaticTripScreen extends StatefulWidget {
  const StaticTripScreen({super.key});

  @override
  State<StaticTripScreen> createState() => _StaticTripScreenState();
}

class _StaticTripScreenState extends State<StaticTripScreen> {
  Trip? _trip;
  bool _isSimulating = false;

  @override
  void initState() {
    super.initState();
    _trip = StaticTripService.getCurrentTrip();
  }

  /// Simulate route change (traffic-based re-routing)
  void _simulateRouteChange() async {
    if (_trip == null || _isSimulating) return;

    setState(() => _isSimulating = true);

    // Simulate processing delay
    await Future.delayed(const Duration(milliseconds: 800));

    final updatedTrip = StaticTripService.simulateRouteChange();

    if (mounted && updatedTrip != null) {
      setState(() {
        _trip = updatedTrip;
        _isSimulating = false;
      });

      // Show alert dialog
      _showTrafficAlertDialog(updatedTrip);
    }
  }

  /// Clear traffic alert and reset to normal
  void _clearTrafficAlert() {
    final updatedTrip = StaticTripService.clearTrafficAlert();
    if (updatedTrip != null) {
      setState(() => _trip = updatedTrip);
    }
  }

  /// Update trip status
  void _updateStatus(TripStatus newStatus) {
    final updatedTrip = StaticTripService.updateTripStatus(newStatus);
    if (updatedTrip != null) {
      setState(() => _trip = updatedTrip);
    }
  }

  /// Show traffic alert dialog
  void _showTrafficAlertDialog(Trip trip) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.warning_amber, color: AppColors.warning),
            ),
            const SizedBox(width: 12),
            const Text('Route Changed'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              trip.trafficAlert ?? 'Route has been re-calculated.',
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.access_time,
                      color: AppColors.error, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'New ETA: ${trip.eta}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.error,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_trip == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Trip Details')),
        body: const Center(child: Text('No active trip')),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(_trip!.tripId),
        actions: [
          // Online status indicator
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: StaticTripService.isOnline
                  ? AppColors.available.withOpacity(0.2)
                  : AppColors.text.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  StaticTripService.isOnline
                      ? Icons.cloud_done
                      : Icons.cloud_off,
                  size: 14,
                  color: StaticTripService.isOnline
                      ? AppColors.available
                      : AppColors.text,
                ),
                const SizedBox(width: 4),
                Text(
                  StaticTripService.isOnline ? 'Online' : 'Offline',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: StaticTripService.isOnline
                        ? AppColors.available
                        : AppColors.text,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Route Status Banner
            _buildRouteStatusBanner(),

            const SizedBox(height: 16),

            // Patient Information
            _buildSectionTitle('Patient Information'),
            const SizedBox(height: 12),
            _buildPatientCard(),

            const SizedBox(height: 20),

            // Journey Timeline
            _buildSectionTitle('Journey Timeline'),
            const SizedBox(height: 12),
            _buildJourneyTimeline(),

            const SizedBox(height: 20),

            // Locations
            _buildSectionTitle('Locations'),
            const SizedBox(height: 12),
            _buildLocationCard('Pickup', _trip!.pickupLocation,
                Icons.location_on, AppColors.warning),
            const SizedBox(height: 12),
            _buildLocationCard('Destination', _trip!.hospitalLocation,
                Icons.local_hospital, AppColors.error),

            const SizedBox(height: 20),

            // Traffic Alert (if any)
            if (_trip!.trafficAlert != null) ...[
              _buildSectionTitle('Traffic Alert'),
              const SizedBox(height: 12),
              _buildTrafficAlertCard(),
              const SizedBox(height: 20),
            ],

            // Simulation Controls
            _buildSectionTitle('Route Simulation'),
            const SizedBox(height: 12),
            _buildSimulationControls(),

            const SizedBox(height: 20),

            // Status Update Buttons
            _buildSectionTitle('Update Status'),
            const SizedBox(height: 12),
            _buildStatusButtons(),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  /// Route status banner (NORMAL, RE-ROUTED, DELAYED)
  Widget _buildRouteStatusBanner() {
    final isRerouted = _trip!.routeStatus == 'RE-ROUTED';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isRerouted
            ? AppColors.warning.withOpacity(0.15)
            : AppColors.available.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isRerouted
              ? AppColors.warning.withOpacity(0.4)
              : AppColors.available.withOpacity(0.4),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isRerouted ? AppColors.warning : AppColors.available,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isRerouted ? Icons.alt_route : Icons.check_circle,
              color: AppColors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _trip!.routeStatus,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isRerouted ? AppColors.warning : AppColors.available,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'ETA: ${_trip!.eta ?? "Calculating..."}',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.text,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _getStatusColor(_trip!.status),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _trip!.status.displayName,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.white,
              ),
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

  /// Patient information card
  Widget _buildPatientCard() {
    final patient = _trip!.patient;

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
        children: [
          // Name and severity
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.person, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      patient.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${patient.age} years • ${patient.gender}',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.text.withOpacity(0.6),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                patient.severityLevel,
                style: const TextStyle(fontSize: 14),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 16),

          // Condition
          _buildPatientInfoRow(
              'Condition', patient.condition, Icons.medical_information),

          const SizedBox(height: 12),

          // Blood group
          if (patient.bloodGroup != null)
            _buildPatientInfoRow(
                'Blood Group', patient.bloodGroup!, Icons.bloodtype),

          if (patient.bloodGroup != null) const SizedBox(height: 12),

          // Contact
          if (patient.contactNumber != null)
            _buildPatientInfoRow(
                'Contact', patient.contactNumber!, Icons.phone),
        ],
      ),
    );
  }

  /// Patient info row
  Widget _buildPatientInfoRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.text.withOpacity(0.5)),
        const SizedBox(width: 10),
        Text(
          '$label: ',
          style: TextStyle(
            fontSize: 13,
            color: AppColors.text.withOpacity(0.6),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  /// Journey timeline
  Widget _buildJourneyTimeline() {
    final statuses = TripStatus.values
        .where(
          (s) => s != TripStatus.cancelled,
        )
        .toList();

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
        children: List.generate(statuses.length, (index) {
          final status = statuses[index];
          final isCompleted = status.index <= _trip!.status.index;
          final isCurrent = status == _trip!.status;
          final isLast = index == statuses.length - 1;

          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Timeline indicator
              Column(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: isCompleted
                          ? AppColors.primary
                          : AppColors.text.withOpacity(0.2),
                      shape: BoxShape.circle,
                      border: isCurrent
                          ? Border.all(color: AppColors.primary, width: 3)
                          : null,
                    ),
                    child: isCompleted
                        ? const Icon(Icons.check,
                            size: 14, color: AppColors.white)
                        : null,
                  ),
                  if (!isLast)
                    Container(
                      width: 2,
                      height: 40,
                      color: isCompleted
                          ? AppColors.primary
                          : AppColors.text.withOpacity(0.2),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              // Status text
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            status.icon,
                            style: const TextStyle(fontSize: 16),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            status.displayName,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight:
                                  isCurrent ? FontWeight.bold : FontWeight.w500,
                              color: isCompleted
                                  ? AppColors.text
                                  : AppColors.text.withOpacity(0.5),
                            ),
                          ),
                        ],
                      ),
                      if (isCurrent)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'Current Status',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  /// Location card
  Widget _buildLocationCard(
      String label, Location location, IconData icon, Color color) {
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
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.text.withOpacity(0.5),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  location.address,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (location.landmark.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    location.landmark,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.text.withOpacity(0.6),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Traffic alert card
  Widget _buildTrafficAlertCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.warning.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber, color: AppColors.warning),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _trip!.trafficAlert!,
              style: const TextStyle(fontSize: 13),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 20),
            onPressed: _clearTrafficAlert,
            tooltip: 'Dismiss',
          ),
        ],
      ),
    );
  }

  /// Simulation controls
  Widget _buildSimulationControls() {
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
          Text(
            'Simulate traffic conditions and route changes',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.text.withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isSimulating ? null : _simulateRouteChange,
              icon: _isSimulating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.white,
                      ),
                    )
                  : const Icon(Icons.alt_route),
              label: Text(
                  _isSimulating ? 'Calculating...' : 'Simulate Route Change'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.warning,
                foregroundColor: AppColors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '• Updates ETA based on traffic\n• Changes route status to RE-ROUTED\n• Displays traffic alert message',
            style: TextStyle(
              fontSize: 11,
              color: AppColors.text.withOpacity(0.5),
            ),
          ),
        ],
      ),
    );
  }

  /// Status update buttons
  Widget _buildStatusButtons() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _buildStatusButton(
            'En Route', TripStatus.enRoute, Icons.directions_car),
        _buildStatusButton('Arrived', TripStatus.arrived, Icons.location_on),
        _buildStatusButton(
            'Patient Onboard', TripStatus.patientOnboard, Icons.person_add),
        _buildStatusButton(
            'Complete', TripStatus.completed, Icons.check_circle),
      ],
    );
  }

  /// Individual status button
  Widget _buildStatusButton(String label, TripStatus status, IconData icon) {
    final isActive = _trip!.status == status;

    return ElevatedButton.icon(
      onPressed: isActive ? null : () => _updateStatus(status),
      icon: Icon(icon, size: 16),
      label: Text(label, style: const TextStyle(fontSize: 12)),
      style: ElevatedButton.styleFrom(
        backgroundColor: isActive ? _getStatusColor(status) : AppColors.white,
        foregroundColor: isActive ? AppColors.white : AppColors.text,
        elevation: isActive ? 2 : 0,
        side: BorderSide(
          color:
              isActive ? Colors.transparent : AppColors.text.withOpacity(0.2),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
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
