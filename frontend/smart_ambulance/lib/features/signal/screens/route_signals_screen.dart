import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../driver/providers/trip_provider.dart';

/// Model for a route signal from /trips/{id}/route-signals
class RouteSignal {
  final String signalId;
  final String? name;
  final double? lat;
  final double? lng;
  final int? order;

  RouteSignal({
    required this.signalId,
    this.name,
    this.lat,
    this.lng,
    this.order,
  });

  factory RouteSignal.fromJson(Map<String, dynamic> json) {
    return RouteSignal(
      signalId: json['signal_id'] ?? json['id'] ?? '',
      name: json['name'],
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      order: json['order'] as int?,
    );
  }
}

/// Model for signal state from /signals/{signal_id}/state
class SignalState {
  final String signalId;
  final String state; // RED, GREEN, YELLOW
  final int? greenTimeRemaining;
  final String? reason;
  final DateTime? updatedAt;

  SignalState({
    required this.signalId,
    required this.state,
    this.greenTimeRemaining,
    this.reason,
    this.updatedAt,
  });

  factory SignalState.fromJson(Map<String, dynamic> json) {
    return SignalState(
      signalId: json['signal_id'] ?? json['id'] ?? '',
      state: json['state'] ?? 'RED',
      greenTimeRemaining: json['green_time_remaining'] as int?,
      reason: json['reason'],
      updatedAt: json['updated_at'] != null 
          ? DateTime.tryParse(json['updated_at']) 
          : null,
    );
  }
}

/// Combined route signal with its current state
class RouteSignalWithState {
  final RouteSignal signal;
  final SignalState? state;

  RouteSignalWithState({
    required this.signal,
    this.state,
  });

  String get displayState => state?.state ?? 'UNKNOWN';
  int? get greenTimeRemaining => state?.greenTimeRemaining;
}

/// Screen showing route signal states during an active trip
class RouteSignalsScreen extends StatefulWidget {
  const RouteSignalsScreen({super.key});

  @override
  State<RouteSignalsScreen> createState() => _RouteSignalsScreenState();
}

class _RouteSignalsScreenState extends State<RouteSignalsScreen> {
  List<RouteSignalWithState> _signals = [];
  bool _isLoading = true;
  String? _errorMessage;
  Timer? _pollingTimer;
  String? _tripId;
  DateTime? _lastUpdated;

  @override
  void initState() {
    super.initState();
    _initializeAndFetch();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _initializeAndFetch() async {
    // Get active trip ID from provider
    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    _tripId = tripProvider.tripId;

    if (_tripId == null || _tripId!.isEmpty) {
      setState(() {
        _errorMessage = 'No active trip found';
        _isLoading = false;
      });
      return;
    }

    // Initial fetch
    await _fetchRouteSignals();

    // Start polling every 5 seconds
    _pollingTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _fetchRouteSignals(),
    );
  }

  /// Fetch route signals for the active trip
  Future<void> _fetchRouteSignals() async {
    if (_tripId == null) return;

    try {
      // Step 1: Get route signals for the trip
      final routeResponse = await ApiService.get('/trips/$_tripId/route-signals');

      if (!ApiService.isSuccess(routeResponse)) {
        throw Exception('Failed to fetch route signals: ${routeResponse.statusCode}');
      }

      final routeData = ApiService.decodeResponse(routeResponse);
      List<RouteSignal> routeSignals = [];

      if (routeData is List) {
        routeSignals = routeData
            .map((item) => RouteSignal.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (routeData is Map && routeData['signals'] != null) {
        routeSignals = (routeData['signals'] as List)
            .map((item) => RouteSignal.fromJson(item as Map<String, dynamic>))
            .toList();
      }

      // Step 2: Fetch state for each signal
      List<RouteSignalWithState> signalsWithState = [];

      for (final signal in routeSignals) {
        SignalState? signalState;
        
        try {
          final stateResponse = await ApiService.get('/signals/${signal.signalId}/state');
          
          if (ApiService.isSuccess(stateResponse)) {
            final stateData = ApiService.decodeResponse(stateResponse);
            if (stateData is Map<String, dynamic>) {
              signalState = SignalState.fromJson(stateData);
            }
          }
        } catch (e) {
          // Continue even if individual signal state fetch fails
          print('[RouteSignals] Failed to fetch state for ${signal.signalId}: $e');
        }

        signalsWithState.add(RouteSignalWithState(
          signal: signal,
          state: signalState,
        ));
      }

      if (mounted) {
        setState(() {
          _signals = signalsWithState;
          _isLoading = false;
          _errorMessage = null;
          _lastUpdated = DateTime.now();
        });
      }
    } catch (e) {
      print('[RouteSignals] Error: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load signals: $e';
          _isLoading = false;
        });
      }
    }
  }

  Color _getSignalColor(String state) {
    switch (state.toUpperCase()) {
      case 'GREEN':
        return Colors.green;
      case 'YELLOW':
        return Colors.amber;
      case 'RED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getSignalIcon(String state) {
    switch (state.toUpperCase()) {
      case 'GREEN':
        return Icons.check_circle;
      case 'YELLOW':
        return Icons.warning;
      case 'RED':
        return Icons.cancel;
      default:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Route Signals'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          // Manual refresh button
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : () {
              setState(() => _isLoading = true);
              _fetchRouteSignals();
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    // Loading state
    if (_isLoading && _signals.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading route signals...'),
          ],
        ),
      );
    }

    // Error state
    if (_errorMessage != null && _signals.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red.shade300,
              ),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.red.shade700,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _isLoading = true;
                    _errorMessage = null;
                  });
                  _fetchRouteSignals();
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    // Empty state
    if (_signals.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.traffic,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            const Text(
              'No signals on current route',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    // Signals list
    return RefreshIndicator(
      onRefresh: _fetchRouteSignals,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Trip info header
          _buildTripHeader(),
          const SizedBox(height: 16),

          // Signal stats summary
          _buildStatsSummary(),
          const SizedBox(height: 16),

          // Last updated indicator
          if (_lastUpdated != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(Icons.access_time, size: 14, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text(
                    'Updated ${_formatTime(_lastUpdated!)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const Spacer(),
                  if (_isLoading)
                    SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(Colors.grey.shade400),
                      ),
                    ),
                ],
              ),
            ),

          // Signal timeline
          _buildSignalTimeline(),
        ],
      ),
    );
  }

  Widget _buildTripHeader() {
    return Card(
      color: AppColors.primary.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              Icons.local_shipping,
              color: AppColors.primary,
              size: 32,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Active Trip',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Trip ID: ${_tripId ?? 'Unknown'}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSummary() {
    final greenCount = _signals.where((s) => s.displayState == 'GREEN').length;
    final yellowCount = _signals.where((s) => s.displayState == 'YELLOW').length;
    final redCount = _signals.where((s) => s.displayState == 'RED').length;
    final unknownCount = _signals.where((s) => 
        s.displayState != 'GREEN' && 
        s.displayState != 'YELLOW' && 
        s.displayState != 'RED'
    ).length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildStatItem('$greenCount', 'Green', Colors.green),
            _buildStatDivider(),
            _buildStatItem('$yellowCount', 'Yellow', Colors.amber),
            _buildStatDivider(),
            _buildStatItem('$redCount', 'Red', Colors.red),
            if (unknownCount > 0) ...[
              _buildStatDivider(),
              _buildStatItem('$unknownCount', 'Unknown', Colors.grey),
            ],
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
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildStatDivider() {
    return Container(
      width: 1,
      height: 40,
      color: Colors.grey.withOpacity(0.3),
    );
  }

  Widget _buildSignalTimeline() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Route Signals',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        ...List.generate(_signals.length, (index) {
          final signalWithState = _signals[index];
          final isLast = index == _signals.length - 1;
          return _buildSignalTimelineItem(signalWithState, isLast);
        }),
      ],
    );
  }

  Widget _buildSignalTimelineItem(RouteSignalWithState signalWithState, bool isLast) {
    final state = signalWithState.displayState;
    final color = _getSignalColor(state);
    final icon = _getSignalIcon(state);
    final greenTime = signalWithState.greenTimeRemaining;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Timeline indicator
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: color.withOpacity(0.4),
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                  child: Icon(
                    icon,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: Colors.grey.shade300,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // Signal card
          Expanded(
            child: Card(
              margin: EdgeInsets.only(bottom: isLast ? 0 : 12),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Signal ID and state
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            signalWithState.signal.signalId,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            state,
                            style: TextStyle(
                              color: color,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    
                    // Signal name if available
                    if (signalWithState.signal.name != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        signalWithState.signal.name!,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],

                    // Green time remaining (only display if provided by backend)
                    if (greenTime != null && state == 'GREEN') ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.timer,
                            size: 14,
                            color: Colors.green.shade600,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Green for ${greenTime}s',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.green.shade600,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],

                    // Reason if available
                    if (signalWithState.state?.reason != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        signalWithState.state!.reason!,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade500,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inSeconds < 10) {
      return 'just now';
    } else if (diff.inSeconds < 60) {
      return '${diff.inSeconds}s ago';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else {
      return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    }
  }
}
