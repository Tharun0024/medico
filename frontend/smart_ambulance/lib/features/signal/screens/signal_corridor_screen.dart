import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/corridor_service.dart';
import '../../../core/services/gps_service.dart';
import '../../../core/theme/app_colors.dart';

/// Screen showing signal corridor status during emergency
class SignalCorridorScreen extends StatefulWidget {
  const SignalCorridorScreen({super.key});

  @override
  State<SignalCorridorScreen> createState() => _SignalCorridorScreenState();
}

class _SignalCorridorScreenState extends State<SignalCorridorScreen> {
  CorridorStatus? _corridorStatus;
  GPSData? _gpsData;
  bool _isLoading = true;
  Timer? _pollingTimer;
  String _severity = 'HIGH';

  @override
  void initState() {
    super.initState();
    _startGPSAndCorridor();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _startGPSAndCorridor() async {
    // Start GPS simulation
    await GPSService.startSimulation(
      routeName: 'default_city_loop',
      speedKmh: 50.0,
    );

    // Initial fetch
    await _fetchData();

    // Start polling every 3 seconds
    _pollingTimer = Timer.periodic(
      const Duration(seconds: 3),
      (_) => _fetchData(),
    );
  }

  Future<void> _fetchData() async {
    final ambulanceId = ApiService.ambulanceId;
    if (ambulanceId == null) return;

    try {
      // Get GPS position
      final gps = await GPSService.getCurrentPosition();

      // Update corridor
      await CorridorService.updateCorridor(severity: _severity);

      // Get corridor status
      final corridor = await CorridorService.getCorridorStatus(ambulanceId);

      if (mounted) {
        setState(() {
          _gpsData = gps;
          _corridorStatus = corridor;
          _isLoading = false;
        });
      }
    } catch (e) {
      print("[SignalCorridorScreen] Error: $e");
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _changeSeverity(String severity) {
    setState(() => _severity = severity);
    _fetchData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Signal Corridor'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // GPS Status Card
                  _buildGPSCard(),
                  const SizedBox(height: 16),

                  // Severity Selector
                  _buildSeveritySelector(),
                  const SizedBox(height: 16),

                  // Corridor Stats
                  _buildCorridorStats(),
                  const SizedBox(height: 16),

                  // Signal List
                  _buildSignalList(),
                ],
              ),
            ),
    );
  }

  Widget _buildGPSCard() {
    final gps = _gpsData;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  gps?.isRunning == true ? Icons.gps_fixed : Icons.gps_off,
                  color: gps?.isRunning == true ? Colors.green : Colors.grey,
                ),
                const SizedBox(width: 8),
                Text(
                  'GPS Status',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (gps != null) ...[
              Text(
                'Position: ${gps.lat.toStringAsFixed(5)}, ${gps.lng.toStringAsFixed(5)}',
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 4),
              Text(
                'Speed: ${gps.speedKmh.toStringAsFixed(1)} km/h',
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 4),
              Text(
                'Route: ${gps.routeName} (Point ${gps.routeIndex})',
                style: const TextStyle(fontSize: 14, color: Colors.grey),
              ),
            ] else
              const Text(
                'GPS not available',
                style: TextStyle(color: Colors.grey),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSeveritySelector() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Emergency Severity',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildSeverityChip('LOW', Colors.green),
                const SizedBox(width: 8),
                _buildSeverityChip('MODERATE', Colors.orange),
                const SizedBox(width: 8),
                _buildSeverityChip('HIGH', Colors.red),
                const SizedBox(width: 8),
                _buildSeverityChip('CRITICAL', Colors.purple),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSeverityChip(String severity, Color color) {
    final isSelected = _severity == severity;
    return ChoiceChip(
      label: Text(
        severity,
        style: TextStyle(
          color: isSelected ? Colors.white : color,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
      selected: isSelected,
      selectedColor: color,
      backgroundColor: color.withOpacity(0.1),
      onSelected: (_) => _changeSeverity(severity),
    );
  }

  Widget _buildCorridorStats() {
    final corridor = _corridorStatus;
    final greenCount = corridor?.greenSignals ?? 0;
    final totalCount = corridor?.states.length ?? 0;

    return Card(
      color: AppColors.primary.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildStatItem(
              '$greenCount',
              'Green Signals',
              Colors.green,
            ),
            Container(width: 1, height: 40, color: Colors.grey.withOpacity(0.3)),
            _buildStatItem(
              '$totalCount',
              'Total Signals',
              Colors.blue,
            ),
            Container(width: 1, height: 40, color: Colors.grey.withOpacity(0.3)),
            _buildStatItem(
              corridor?.hospitalId ?? '-',
              'Hospital',
              Colors.orange,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String value, String label, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }

  Widget _buildSignalList() {
    final signals = _corridorStatus?.states ?? [];

    if (signals.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Center(
            child: Column(
              children: [
                Icon(Icons.traffic, size: 48, color: Colors.grey.shade400),
                const SizedBox(height: 8),
                const Text(
                  'No signals in corridor',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Corridor Signals',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        ...signals.map((signal) => _buildSignalTile(signal)),
      ],
    );
  }

  Widget _buildSignalTile(CorridorSignal signal) {
    final isGreen = signal.state == 'GREEN';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: isGreen ? Colors.green : Colors.red,
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.traffic,
            color: Colors.white,
            size: 24,
          ),
        ),
        title: Text(
          signal.signalId,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(signal.reason),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              isGreen ? 'GREEN' : 'RED',
              style: TextStyle(
                color: isGreen ? Colors.green : Colors.red,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '${signal.distanceKm.toStringAsFixed(2)} km',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
