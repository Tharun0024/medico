import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Primary action button with consistent styling
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isEmergency;
  final bool isLoading;
  final IconData? icon;

  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isEmergency = false,
    this.isLoading = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: isEmergency ? AppColors.accent : AppColors.primary,
          foregroundColor: AppColors.white,
          elevation: isEmergency ? 4 : 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: AppColors.white,
                  strokeWidth: 2,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 22),
                    const SizedBox(width: 10),
                  ],
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
