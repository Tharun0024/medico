import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../auth/services/auth_service.dart';

/// Login Screen for Ambulance Driver
/// Simple centered layout with Username and Password fields
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Pre-fill demo credentials matching backend's ambulance.json
    // Available ambulances: AMB_001 to AMB_025
    _usernameController.text = 'AMB_001';
    _passwordController.text = 'sec-amb-001';
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Real login handler using AuthService
  Future<void> _handleLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please enter username and password');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await AuthService.login(username, password);

      if (mounted) {
        if (result['success'] == true) {
          Navigator.pushReplacementNamed(context, '/home');
        } else {
          setState(() {
            _errorMessage = result['message'] ?? 'Login failed';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Connection error. Check if backend is running.';
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
                    Icons.local_shipping,
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
                  'Driver Login',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.text.withOpacity(0.6),
                      ),
                ),

                const SizedBox(height: 48),

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

                // Username Field
                TextField(
                  controller: _usernameController,
                  keyboardType: TextInputType.text,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Username',
                    hintText: 'Enter your username',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                ),

                const SizedBox(height: 20),

                // Password Field
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _handleLogin(),
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    hintText: 'Enter password',
                    prefixIcon: Icon(Icons.lock_outline),
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

                // Demo hint text
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color: AppColors.text.withOpacity(0.6),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Demo: driver1 / demo123',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.text.withOpacity(0.6),
                        ),
                      ),
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
}
