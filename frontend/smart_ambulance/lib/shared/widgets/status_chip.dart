import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Status chip widget showing ambulance availability status
class StatusChip extends StatelessWidget {
  final bool isAvailable;

  const StatusChip({
    super.key,
    required this.isAvailable,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isAvailable
            ? AppColors.available.withOpacity(0.15)
            : AppColors.busy.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isAvailable ? AppColors.available : AppColors.busy,
          width: 1.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: isAvailable ? AppColors.available : AppColors.busy,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            isAvailable ? 'Available' : 'Busy',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isAvailable ? AppColors.available : AppColors.busy,
            ),
          ),
        ],
      ),
    );
  }
}
