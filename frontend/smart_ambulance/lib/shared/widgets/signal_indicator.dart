import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Traffic signal indicator widget for green corridor visualization
class SignalIndicator extends StatelessWidget {
  final bool isGreen;
  final String label;

  const SignalIndicator({
    super.key,
    required this.isGreen,
    this.label = '',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isGreen ? AppColors.available : AppColors.error,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: AppColors.text, width: 2),
            boxShadow: [
              BoxShadow(
                color: (isGreen ? AppColors.available : AppColors.error)
                    .withOpacity(0.5),
                blurRadius: 8,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Icon(
            Icons.traffic,
            color: AppColors.white,
            size: 18,
          ),
        ),
        if (label.isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w500,
              color: AppColors.text,
            ),
          ),
        ],
      ],
    );
  }
}
