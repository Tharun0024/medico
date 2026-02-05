import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Info card widget for displaying trip/emergency information
class InfoCard extends StatelessWidget {
  final String title;
  final List<InfoRow> rows;
  final Color? accentColor;

  const InfoCard({
    super.key,
    required this.title,
    required this.rows,
    this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
        border: accentColor != null
            ? Border.all(color: accentColor!, width: 2)
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: accentColor ?? AppColors.text,
            ),
          ),
          const SizedBox(height: 16),
          ...rows.map((row) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: row,
              )),
        ],
      ),
    );
  }
}

/// Individual row in an info card
class InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const InfoRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: AppColors.text.withOpacity(0.7),
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: valueColor ?? AppColors.text,
          ),
        ),
      ],
    );
  }
}
