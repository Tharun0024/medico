import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Mock Map Widget for demo purposes
/// Displays a placeholder map with optional overlays
class MockMapWidget extends StatelessWidget {
  final Widget? overlay;
  final bool showAccidentPin;
  final bool showHospitalPin;
  final bool showRoute;
  final bool isGreenCorridor;
  final List<Widget>? signalIndicators;

  const MockMapWidget({
    super.key,
    this.overlay,
    this.showAccidentPin = false,
    this.showHospitalPin = false,
    this.showRoute = false,
    this.isGreenCorridor = false,
    this.signalIndicators,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.secondary.withOpacity(0.3),
        border: Border.all(color: AppColors.secondary, width: 2),
      ),
      child: Stack(
        children: [
          // Mock map background with grid
          CustomPaint(
            size: Size.infinite,
            painter: _MapGridPainter(),
          ),

          // Mock streets
          CustomPaint(
            size: Size.infinite,
            painter: _StreetPainter(),
          ),

          // Route line if enabled
          if (showRoute)
            CustomPaint(
              size: Size.infinite,
              painter: _RoutePainter(isGreenCorridor: isGreenCorridor),
            ),

          // Signal indicators along route
          if (signalIndicators != null) ...signalIndicators!,

          // Accident pin
          if (showAccidentPin)
            Positioned(
              top: 120,
              left: 80,
              child: _MapPin(
                icon: Icons.warning_rounded,
                color: AppColors.accent,
                label: 'Accident',
              ),
            ),

          // Hospital pin
          if (showHospitalPin)
            Positioned(
              bottom: 150,
              right: 60,
              child: _MapPin(
                icon: Icons.local_hospital,
                color: AppColors.primary,
                label: 'Hospital',
              ),
            ),

          // Current location indicator
          Center(
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.white, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.3),
                    blurRadius: 10,
                    spreadRadius: 3,
                  ),
                ],
              ),
            ),
          ),

          // Ambulance icon at current location
          Center(
            child: Transform.translate(
              offset: const Offset(0, -25),
              child: Icon(
                Icons.local_shipping,
                color: AppColors.primary,
                size: 28,
              ),
            ),
          ),

          // Map label
          Positioned(
            bottom: 10,
            left: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.white.withOpacity(0.9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.map,
                      size: 14, color: AppColors.text.withOpacity(0.6)),
                  const SizedBox(width: 4),
                  Text(
                    'Map View (Demo)',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppColors.text.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Optional overlay (for info cards, etc.)
          if (overlay != null) overlay!,
        ],
      ),
    );
  }
}

/// Map pin marker widget
class _MapPin extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;

  const _MapPin({
    required this.icon,
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.4),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Icon(icon, color: AppColors.white, size: 20),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ),
      ],
    );
  }
}

/// Custom painter for map grid background
class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.secondary.withOpacity(0.5)
      ..strokeWidth = 0.5;

    // Draw grid lines
    const spacing = 40.0;
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

/// Custom painter for mock streets
class _StreetPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.white
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    // Horizontal streets
    canvas.drawLine(
      Offset(0, size.height * 0.3),
      Offset(size.width, size.height * 0.3),
      paint,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.6),
      Offset(size.width, size.height * 0.6),
      paint,
    );

    // Vertical streets
    canvas.drawLine(
      Offset(size.width * 0.25, 0),
      Offset(size.width * 0.25, size.height),
      paint,
    );
    canvas.drawLine(
      Offset(size.width * 0.65, 0),
      Offset(size.width * 0.65, size.height),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Custom painter for route polyline
class _RoutePainter extends CustomPainter {
  final bool isGreenCorridor;

  _RoutePainter({this.isGreenCorridor = false});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isGreenCorridor ? AppColors.greenCorridor : AppColors.primary
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final path = Path();
    path.moveTo(size.width * 0.5, size.height * 0.5);
    path.lineTo(size.width * 0.5, size.height * 0.3);
    path.lineTo(size.width * 0.25, size.height * 0.3);
    path.lineTo(size.width * 0.25, size.height * 0.15);

    // Add glow effect for green corridor
    if (isGreenCorridor) {
      final glowPaint = Paint()
        ..color = AppColors.greenCorridor.withOpacity(0.3)
        ..strokeWidth = 16
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke;
      canvas.drawPath(path, glowPaint);
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
