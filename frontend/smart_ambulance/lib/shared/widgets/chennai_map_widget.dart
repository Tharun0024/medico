import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Chennai bounds for coordinate mapping
class ChennaiBounds {
  static const double minLat = 12.85;
  static const double maxLat = 13.25;
  static const double minLng = 80.05;
  static const double maxLng = 80.35;
  static const double centerLat = 13.0827;
  static const double centerLng = 80.2707;
}

/// Hospital data
class Hospital {
  final String id;
  final String name;
  final double lat;
  final double lng;

  const Hospital({
    required this.id,
    required this.name,
    required this.lat,
    required this.lng,
  });
}

/// Traffic signal data
class TrafficSignal {
  final String id;
  final String name;
  final double lat;
  final double lng;
  final bool isPriority;

  const TrafficSignal({
    required this.id,
    required this.name,
    required this.lat,
    required this.lng,
    this.isPriority = false,
  });
}

/// Static Chennai data
const List<Hospital> chennaiHospitals = [
  Hospital(id: 'H1', name: 'Apollo Hospital', lat: 13.0547, lng: 80.2526),
  Hospital(id: 'H2', name: 'Govt General Hospital', lat: 13.0732, lng: 80.2774),
  Hospital(id: 'H3', name: 'MIOT International', lat: 13.0132, lng: 80.1715),
  Hospital(id: 'H4', name: 'Fortis Malar', lat: 13.0078, lng: 80.2569),
  Hospital(id: 'H5', name: 'Kauvery Hospital', lat: 13.0289, lng: 80.2418),
];

const List<TrafficSignal> chennaiSignals = [
  TrafficSignal(
      id: 'SIG-001', name: 'Anna Salai Junction', lat: 13.0569, lng: 80.2425),
  TrafficSignal(
      id: 'SIG-002', name: 'Kathipara Flyover', lat: 13.0067, lng: 80.2082),
  TrafficSignal(
      id: 'SIG-003', name: 'T Nagar Main', lat: 13.0418, lng: 80.2341),
  TrafficSignal(
      id: 'SIG-004', name: 'Adyar Signal', lat: 13.0012, lng: 80.2565),
  TrafficSignal(
      id: 'SIG-005', name: 'Guindy Junction', lat: 13.0167, lng: 80.2182),
  TrafficSignal(
      id: 'SIG-006', name: 'Velachery Main', lat: 12.9815, lng: 80.2180),
];

/// Enhanced Chennai Map Widget for ambulance driver app
class ChennaiMapWidget extends StatefulWidget {
  final double? ambulanceLat;
  final double? ambulanceLng;
  final double? patientLat;
  final double? patientLng;
  final double? hospitalLat;
  final double? hospitalLng;
  final String? destinationName;
  final bool showRoute;
  final bool isGreenCorridor;
  final List<String> prioritySignalIds;
  final String tripState;
  final Widget? bottomOverlay;

  const ChennaiMapWidget({
    super.key,
    this.ambulanceLat,
    this.ambulanceLng,
    this.patientLat,
    this.patientLng,
    this.hospitalLat,
    this.hospitalLng,
    this.destinationName,
    this.showRoute = false,
    this.isGreenCorridor = false,
    this.prioritySignalIds = const [],
    this.tripState = 'IDLE',
    this.bottomOverlay,
  });

  @override
  State<ChennaiMapWidget> createState() => _ChennaiMapWidgetState();
}

class _ChennaiMapWidgetState extends State<ChennaiMapWidget>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _routeController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _routeAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _routeController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _routeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _routeController, curve: Curves.linear),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _routeController.dispose();
    super.dispose();
  }

  /// Convert lat/lng to screen position
  Offset _toPosition(double lat, double lng, Size size) {
    final xPercent = (lng - ChennaiBounds.minLng) /
        (ChennaiBounds.maxLng - ChennaiBounds.minLng);
    final yPercent = 1.0 -
        (lat - ChennaiBounds.minLat) /
            (ChennaiBounds.maxLat - ChennaiBounds.minLat);
    return Offset(
      xPercent.clamp(0.02, 0.98) * size.width,
      yPercent.clamp(0.02, 0.98) * size.height,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.secondary.withOpacity(0.3),
            AppColors.secondary.withOpacity(0.5),
          ],
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = Size(constraints.maxWidth, constraints.maxHeight);

          return Stack(
            children: [
              // Grid pattern background
              CustomPaint(
                size: size,
                painter: _GridPainter(),
              ),

              // Road network
              CustomPaint(
                size: size,
                painter: _RoadNetworkPainter(),
              ),

              // Route line
              if (widget.showRoute)
                AnimatedBuilder(
                  animation: _routeAnimation,
                  builder: (context, child) {
                    return CustomPaint(
                      size: size,
                      painter: _RoutePainter(
                        ambulancePos: widget.ambulanceLat != null
                            ? _toPosition(widget.ambulanceLat!,
                                widget.ambulanceLng!, size)
                            : null,
                        patientPos: widget.patientLat != null
                            ? _toPosition(
                                widget.patientLat!, widget.patientLng!, size)
                            : null,
                        hospitalPos: widget.hospitalLat != null
                            ? _toPosition(
                                widget.hospitalLat!, widget.hospitalLng!, size)
                            : null,
                        isGreenCorridor: widget.isGreenCorridor,
                        tripState: widget.tripState,
                        animationValue: _routeAnimation.value,
                      ),
                    );
                  },
                ),

              // Traffic signals
              ...chennaiSignals.map((signal) {
                final pos = _toPosition(signal.lat, signal.lng, size);
                final isPriority = widget.prioritySignalIds.contains(signal.id);
                return _SignalMarker(
                  position: pos,
                  signal: signal,
                  isPriority: isPriority,
                  pulseAnimation: _pulseAnimation,
                );
              }),

              // Hospitals
              ...chennaiHospitals.map((hospital) {
                final pos = _toPosition(hospital.lat, hospital.lng, size);
                final isDestination = widget.hospitalLat != null &&
                    (hospital.lat - widget.hospitalLat!).abs() < 0.01 &&
                    (hospital.lng - widget.hospitalLng!).abs() < 0.01;
                return _HospitalMarker(
                  position: pos,
                  hospital: hospital,
                  isDestination: isDestination,
                );
              }),

              // Patient marker
              if (widget.patientLat != null && widget.patientLng != null)
                _PatientMarker(
                  position:
                      _toPosition(widget.patientLat!, widget.patientLng!, size),
                  pulseAnimation: _pulseAnimation,
                  isPickedUp: widget.tripState == 'PATIENT_ONBOARD',
                ),

              // Ambulance marker (current location)
              if (widget.ambulanceLat != null && widget.ambulanceLng != null)
                AnimatedBuilder(
                  animation: _pulseAnimation,
                  builder: (context, child) {
                    return _AmbulanceMarker(
                      position: _toPosition(
                          widget.ambulanceLat!, widget.ambulanceLng!, size),
                      scale: _pulseAnimation.value,
                      isMoving: widget.tripState != 'IDLE',
                    );
                  },
                ),

              // Location label
              Positioned(
                top: 16,
                left: 16,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.95),
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: AppColors.available,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Chennai, Tamil Nadu',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.text,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Green corridor indicator
              if (widget.isGreenCorridor)
                Positioned(
                  top: 16,
                  right: 16,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.available,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.available.withOpacity(0.4),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.route, size: 16, color: Colors.white),
                        SizedBox(width: 6),
                        Text(
                          'GREEN CORRIDOR',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Destination info
              if (widget.destinationName != null)
                Positioned(
                  bottom: 100,
                  left: 20,
                  right: 20,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
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
                            color: _getTripStateColor(widget.tripState)
                                .withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            _getTripStateIcon(widget.tripState),
                            color: _getTripStateColor(widget.tripState),
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _getTripStateLabel(widget.tripState),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: _getTripStateColor(widget.tripState),
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                widget.destinationName!,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.text,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.chevron_right,
                          color: AppColors.text.withOpacity(0.4),
                        ),
                      ],
                    ),
                  ),
                ),

              // Bottom overlay
              if (widget.bottomOverlay != null) widget.bottomOverlay!,
            ],
          );
        },
      ),
    );
  }

  Color _getTripStateColor(String state) {
    switch (state) {
      case 'EN_ROUTE_TO_PATIENT':
      case 'HEADING_TO_ACCIDENT':
        return AppColors.accent;
      case 'PATIENT_ONBOARD':
      case 'EN_ROUTE_TO_HOSPITAL':
        return AppColors.primary;
      case 'COMPLETED':
        return AppColors.available;
      default:
        return AppColors.text.withOpacity(0.5);
    }
  }

  IconData _getTripStateIcon(String state) {
    switch (state) {
      case 'EN_ROUTE_TO_PATIENT':
      case 'HEADING_TO_ACCIDENT':
        return Icons.person_pin_circle;
      case 'PATIENT_ONBOARD':
      case 'EN_ROUTE_TO_HOSPITAL':
        return Icons.local_hospital;
      case 'COMPLETED':
        return Icons.check_circle;
      default:
        return Icons.location_on;
    }
  }

  String _getTripStateLabel(String state) {
    switch (state) {
      case 'EN_ROUTE_TO_PATIENT':
      case 'HEADING_TO_ACCIDENT':
        return 'NAVIGATING TO PATIENT';
      case 'PATIENT_ONBOARD':
      case 'EN_ROUTE_TO_HOSPITAL':
        return 'NAVIGATING TO HOSPITAL';
      case 'COMPLETED':
        return 'TRIP COMPLETED';
      default:
        return 'DESTINATION';
    }
  }
}

/// Grid pattern painter
class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primary.withOpacity(0.08)
      ..strokeWidth = 1;

    const spacing = 30.0;

    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }

    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Road network painter
class _RoadNetworkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final roadPaint = Paint()
      ..color = Colors.grey.withOpacity(0.3)
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;

    // Main roads
    canvas.drawLine(
      Offset(size.width * 0.1, size.height * 0.5),
      Offset(size.width * 0.9, size.height * 0.5),
      roadPaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.5, size.height * 0.1),
      Offset(size.width * 0.5, size.height * 0.9),
      roadPaint,
    );

    // Diagonal roads
    final diagonalPaint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    canvas.drawLine(
      Offset(size.width * 0.2, size.height * 0.2),
      Offset(size.width * 0.8, size.height * 0.8),
      diagonalPaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.8, size.height * 0.2),
      Offset(size.width * 0.2, size.height * 0.8),
      diagonalPaint,
    );

    // Ring road
    final ringPaint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    canvas.drawCircle(
      Offset(size.width * 0.5, size.height * 0.5),
      size.width * 0.3,
      ringPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Route painter with animation
class _RoutePainter extends CustomPainter {
  final Offset? ambulancePos;
  final Offset? patientPos;
  final Offset? hospitalPos;
  final bool isGreenCorridor;
  final String tripState;
  final double animationValue;

  _RoutePainter({
    this.ambulancePos,
    this.patientPos,
    this.hospitalPos,
    this.isGreenCorridor = false,
    this.tripState = 'IDLE',
    this.animationValue = 0.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (ambulancePos == null) return;

    final routePaint = Paint()
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    // Draw ambulance to patient route (if not picked up)
    if (patientPos != null &&
        tripState != 'PATIENT_ONBOARD' &&
        tripState != 'EN_ROUTE_TO_HOSPITAL') {
      routePaint.color = AppColors.accent;
      _drawDashedLine(canvas, ambulancePos!, patientPos!, routePaint);
    }

    // Draw patient to hospital route
    if (hospitalPos != null && patientPos != null) {
      routePaint.color =
          isGreenCorridor ? AppColors.available : AppColors.primary;

      final startPos = (tripState == 'PATIENT_ONBOARD' ||
              tripState == 'EN_ROUTE_TO_HOSPITAL')
          ? ambulancePos!
          : patientPos!;

      _drawDashedLine(canvas, startPos, hospitalPos!, routePaint);
    }
  }

  void _drawDashedLine(Canvas canvas, Offset start, Offset end, Paint paint) {
    const dashWidth = 10.0;
    const dashSpace = 5.0;

    final dx = end.dx - start.dx;
    final dy = end.dy - start.dy;
    final distance = math.sqrt(dx * dx + dy * dy);
    final unitDx = dx / distance;
    final unitDy = dy / distance;

    var currentDistance = 0.0;
    var drawDash = true;

    while (currentDistance < distance) {
      final segmentLength = drawDash ? dashWidth : dashSpace;
      final endDistance = math.min(currentDistance + segmentLength, distance);

      if (drawDash) {
        canvas.drawLine(
          Offset(
            start.dx + unitDx * currentDistance,
            start.dy + unitDy * currentDistance,
          ),
          Offset(
            start.dx + unitDx * endDistance,
            start.dy + unitDy * endDistance,
          ),
          paint,
        );
      }

      currentDistance = endDistance;
      drawDash = !drawDash;
    }
  }

  @override
  bool shouldRepaint(covariant _RoutePainter oldDelegate) =>
      animationValue != oldDelegate.animationValue ||
      tripState != oldDelegate.tripState;
}

/// Ambulance marker
class _AmbulanceMarker extends StatelessWidget {
  final Offset position;
  final double scale;
  final bool isMoving;

  const _AmbulanceMarker({
    required this.position,
    required this.scale,
    required this.isMoving,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: position.dx - 24,
      top: position.dy - 24,
      child: Transform.scale(
        scale: isMoving ? scale : 1.0,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.primary,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withOpacity(0.4),
                blurRadius: 12,
                spreadRadius: 4,
              ),
            ],
          ),
          child: const Icon(
            Icons.local_shipping,
            color: Colors.white,
            size: 24,
          ),
        ),
      ),
    );
  }
}

/// Hospital marker
class _HospitalMarker extends StatelessWidget {
  final Offset position;
  final Hospital hospital;
  final bool isDestination;

  const _HospitalMarker({
    required this.position,
    required this.hospital,
    required this.isDestination,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: position.dx - 16,
      top: position.dy - 16,
      child: Tooltip(
        message: hospital.name,
        child: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isDestination ? AppColors.primary : Colors.red.shade600,
            borderRadius: BorderRadius.circular(8),
            border: isDestination
                ? Border.all(
                    color: AppColors.primary.withOpacity(0.5), width: 3)
                : null,
            boxShadow: [
              BoxShadow(
                color: (isDestination ? AppColors.primary : Colors.red)
                    .withOpacity(0.3),
                blurRadius: 8,
                spreadRadius: isDestination ? 2 : 0,
              ),
            ],
          ),
          child: const Icon(
            Icons.local_hospital,
            color: Colors.white,
            size: 18,
          ),
        ),
      ),
    );
  }
}

/// Patient marker
class _PatientMarker extends StatelessWidget {
  final Offset position;
  final Animation<double> pulseAnimation;
  final bool isPickedUp;

  const _PatientMarker({
    required this.position,
    required this.pulseAnimation,
    required this.isPickedUp,
  });

  @override
  Widget build(BuildContext context) {
    if (isPickedUp) return const SizedBox.shrink();

    return Positioned(
      left: position.dx - 18,
      top: position.dy - 18,
      child: AnimatedBuilder(
        animation: pulseAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: pulseAnimation.value,
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.accent,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.accent.withOpacity(0.5),
                    blurRadius: 10,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Icon(
                Icons.person,
                color: Colors.white,
                size: 20,
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Signal marker
class _SignalMarker extends StatelessWidget {
  final Offset position;
  final TrafficSignal signal;
  final bool isPriority;
  final Animation<double> pulseAnimation;

  const _SignalMarker({
    required this.position,
    required this.signal,
    required this.isPriority,
    required this.pulseAnimation,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: position.dx - 10,
      top: position.dy - 10,
      child: Tooltip(
        message: '${signal.name}${isPriority ? ' (PRIORITY)' : ''}',
        child: AnimatedBuilder(
          animation: pulseAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: isPriority ? pulseAnimation.value : 1.0,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: isPriority ? AppColors.available : Colors.red.shade400,
                  shape: BoxShape.circle,
                  boxShadow: isPriority
                      ? [
                          BoxShadow(
                            color: AppColors.available.withOpacity(0.6),
                            blurRadius: 10,
                            spreadRadius: 3,
                          ),
                        ]
                      : null,
                ),
                child: Icon(
                  Icons.traffic,
                  color: Colors.white,
                  size: 12,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
