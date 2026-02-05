import 'package:flutter/material.dart';
// Note: google_maps_flutter removed for simplicity
// Add google_maps_flutter package and API keys for production use

/// Reusable Map widget placeholder
/// In production, replace with GoogleMap from google_maps_flutter
class MapWidget extends StatelessWidget {
  final double centerLat;
  final double centerLng;
  final double zoom;
  final Widget? overlay;

  const MapWidget({
    super.key,
    this.centerLat = 13.0827,
    this.centerLng = 80.2707,
    this.zoom = 14,
    this.overlay,
  });

  @override
  Widget build(BuildContext context) {
    // Placeholder - shows a styled container instead of actual map
    return Container(
      color: const Color(0xFFE5E7EB),
      child: Stack(
        children: [
          // Grid pattern to simulate map
          CustomPaint(
            painter: _MapGridPainter(),
            size: Size.infinite,
          ),
          // Center marker
          const Center(
            child: Icon(
              Icons.location_on,
              color: Color(0xFF0F766E),
              size: 40,
            ),
          ),
          // Label
          const Positioned(
            bottom: 20,
            right: 20,
            child: Text(
              'Map Placeholder',
              style: TextStyle(
                color: Color(0xFF6B7280),
                fontSize: 12,
              ),
            ),
          ),
          // Custom overlay
          if (overlay != null) overlay!,
        ],
      ),
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFD1D5DB)
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
