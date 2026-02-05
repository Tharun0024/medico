import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Material 3 Theme configuration for Smart Ambulance App
class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,

      // Color Scheme based on our palette
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        tertiary: AppColors.accent,
        surface: AppColors.background,
        error: AppColors.error,
        onPrimary: AppColors.white,
        onSecondary: AppColors.text,
        onSurface: AppColors.text,
        onError: AppColors.white,
      ),

      // Scaffold background
      scaffoldBackgroundColor: AppColors.background,

      // AppBar Theme
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: true,
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: AppColors.white,
        ),
      ),

      // Text Theme
      textTheme: GoogleFonts.interTextTheme().copyWith(
        headlineLarge: GoogleFonts.inter(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: AppColors.text,
        ),
        headlineMedium: GoogleFonts.inter(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: AppColors.text,
        ),
        titleLarge: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.text,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: AppColors.text,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.normal,
          color: AppColors.text,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          color: AppColors.text,
        ),
        labelLarge: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: AppColors.text,
        ),
      ),

      // Elevated Button Theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Outlined Button Theme
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary, width: 2),
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Input Decoration Theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.secondary),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.secondary, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        labelStyle: GoogleFonts.inter(
          color: AppColors.text.withOpacity(0.7),
        ),
        hintStyle: GoogleFonts.inter(
          color: AppColors.text.withOpacity(0.5),
        ),
      ),

      // Card Theme
      cardTheme: CardThemeData(
        elevation: 2,
        color: AppColors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        margin: const EdgeInsets.all(8),
      ),

      // Chip Theme
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.secondary,
        labelStyle: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: AppColors.text,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    );
  }
}
