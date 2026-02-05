import 'package:flutter/material.dart';

/// App color palette for Smart Ambulance Routing System
/// Following the strict hackathon color requirements
class AppColors {
  AppColors._();

  // Primary: Deep Teal
  static const Color primary = Color(0xFF0F766E);

  // Secondary: Soft Mint
  static const Color secondary = Color(0xFF99F6E4);

  // Accent (Emergency): Amber
  static const Color accent = Color(0xFFF59E0B);

  // Background: Off White
  static const Color background = Color(0xFFF8FAFC);

  // Text: Charcoal
  static const Color text = Color(0xFF1F2937);

  // Status Colors
  static const Color available = Color(0xFF10B981); // Green for available
  static const Color busy = Color(0xFFF59E0B); // Amber for busy

  // Map route colors
  static const Color routeHighlight = Color(0xFF0F766E);
  static const Color greenCorridor = Color(0xFF10B981);

  // Additional utility colors
  static const Color white = Colors.white;
  static const Color error = Color(0xFFEF4444);
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B); // Amber for warnings
}
