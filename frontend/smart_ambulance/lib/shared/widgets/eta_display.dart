import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// ETA countdown display widget
class EtaDisplay extends StatelessWidget {
  final String eta;
  final String? subtitle;
  final bool isPriority;

  const EtaDisplay({
    super.key,
    required this.eta,
    this.subtitle,
    this.isPriority = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: isPriority
            ? AppColors.accent.withOpacity(0.1)
            : AppColors.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPriority ? AppColors.accent : AppColors.primary,
          width: 1.5,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.timer_outlined,
                color: isPriority ? AppColors.accent : AppColors.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                'ETA',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isPriority ? AppColors.accent : AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            eta,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: isPriority ? AppColors.accent : AppColors.primary,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle!,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.text.withOpacity(0.7),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
