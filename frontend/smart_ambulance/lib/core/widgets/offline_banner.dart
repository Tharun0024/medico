import 'package:flutter/material.dart';

/// Shows a red banner when internet connection is lost
/// Note: connectivity_plus dependency removed for simplicity
/// In production, add connectivity_plus package and uncomment the stream logic
class OfflineBanner extends StatelessWidget {
  final bool isOffline;
  
  const OfflineBanner({
    super.key,
    this.isOffline = false,
  });

  @override
  Widget build(BuildContext context) {
    if (!isOffline) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      color: Colors.red,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.wifi_off,
            color: Colors.white,
            size: 18,
          ),
          SizedBox(width: 8),
          Text(
            "No Internet Connection",
            style: TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
