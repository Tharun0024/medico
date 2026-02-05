import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../auth/services/static_auth_service.dart';

/// Login Screen for Ambulance Driver (Phase 1 - Static Data)
/// Uses ambulance_id and secret for authentication against static data
/// No backend API calls
class StaticLoginScreen extends StatefulWidget {
  const StaticLoginScreen({super.key});

  @override
  State<StaticLoginScreen> createState() => _StaticLoginScreenState();
}

class _StaticLoginScreenState extends State<StaticLoginScreen> {
  final _ambulanceIdController = TextEditingController();
  final _secretController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;
  bool _obscureSecret = true;

  @override
  void initState() {
    super.initState();
    // Pre-fill demo credentials (AMB_001 from static data)
    _ambulanceIdController.text = 'AMB_001';
    _secretController.text = 'sec-amb-001';
  }

  @override
  void dispose() {
    _ambulanceIdController.dispose();
    _secretController.dispose();
    super.dispose();
  }

  /// Handle login using static auth service
  Future<void> _handleLogin() async {
    final ambulanceId = _ambulanceIdController.text.trim();
    final secret = _secretController.text.trim();

    if (ambulanceId.isEmpty || secret.isEmpty) {
      setState(() => _errorMessage = 'Please enter Ambulance ID and Secret');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    // Small delay for UX (simulate network)
    await Future.delayed(const Duration(milliseconds: 500));

    final result = await StaticAuthService.login(ambulanceId, secret);

    if (mounted) {
      if (result['success'] == true) {
        Navigator.pushReplacementNamed(context, '/static-dashboard');
      } else {
        setState(() {
          _errorMessage = result['message'] ?? 'Login failed';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // App Logo / Icon
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.local_hospital,
                    size: 50,
                    color: AppColors.white,
                  ),
                ),

                const SizedBox(height: 32),

                // App Title
                Text(
                  'Smart Ambulance',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                ),

                const SizedBox(height: 8),

                Text(
                  'Ambulance Login',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.text.withOpacity(0.6),
                      ),
                ),

                // Phase 1 indicator
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Phase 1 - Offline Mode',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.warning,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),

                const SizedBox(height: 40),

                // Error message
                if (_errorMessage != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: AppColors.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.error.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline, color: AppColors.error, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: TextStyle(color: AppColors.error, fontSize: 14),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Ambulance ID Field
                TextField(
                  controller: _ambulanceIdController,
                  keyboardType: TextInputType.text,
                  textInputAction: TextInputAction.next,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                    labelText: 'Ambulance ID',
                    hintText: 'e.g., AMB_001',
                    prefixIcon: Icon(Icons.local_shipping_outlined),
                  ),
                ),

                const SizedBox(height: 20),

                // Secret Field
                TextField(
                  controller: _secretController,
                  obscureText: _obscureSecret,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _handleLogin(),
                  decoration: InputDecoration(
                    labelText: 'Secret',
                    hintText: 'Enter ambulance secret',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureSecret ? Icons.visibility_off : Icons.visibility,
                      ),
                      onPressed: () {
                        setState(() => _obscureSecret = !_obscureSecret);
                      },
                    ),
                  ),
                ),

                const SizedBox(height: 40),

                // Login Button
                PrimaryButton(
                  label: 'Login',
                  onPressed: _handleLogin,
                  isLoading: _isLoading,
                  icon: Icons.login,
                ),

                const SizedBox(height: 24),

                // Demo credentials hint
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.info_outline,
                            size: 16,
                            color: AppColors.text.withOpacity(0.6),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Demo Credentials',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.text.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _buildCredentialHint('AMB_001', 'sec-amb-001'),
                      _buildCredentialHint('AMB_004', 'sec-amb-004'),
                      _buildCredentialHint('AMB_007', 'sec-amb-007'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCredentialHint(String id, String secret) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$id / $secret',
            style: TextStyle(
              fontSize: 11,
              fontFamily: 'monospace',
              color: AppColors.text.withOpacity(0.5),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              setState(() {
                _ambulanceIdController.text = id;
                _secretController.text = secret;
              });
            },
            child: Icon(
              Icons.content_copy,
              size: 14,
              color: AppColors.primary.withOpacity(0.6),
            ),
          ),
        ],
      ),
    );
  }
}
