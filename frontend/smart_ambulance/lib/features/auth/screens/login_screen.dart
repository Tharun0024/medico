import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _ambulanceIdController = TextEditingController();
  final _secretController = TextEditingController();

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Pre-fill demo credentials (AMB_001 from backend)
    _ambulanceIdController.text = 'AMB_001';
    _secretController.text = 'sec-amb-001';
  }

  Future<void> _handleLogin() async {
    if (_ambulanceIdController.text.isEmpty ||
        _secretController.text.isEmpty) {
      setState(() {
        _errorMessage = "Please enter Ambulance ID and Secret";
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await AuthService.login(
      _ambulanceIdController.text.trim(),
      _secretController.text.trim(),
    );

    setState(() {
      _isLoading = false;
    });

    if (result['success'] == true) {
      // Navigate to Home / Driver Dashboard
      Navigator.pushReplacementNamed(context, "/home");
    } else {
      setState(() {
        _errorMessage = result['message'] ?? "Invalid credentials";
      });
    }
  }

  @override
  void dispose() {
    _ambulanceIdController.dispose();
    _secretController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // App Title
              const Icon(
                Icons.local_hospital,
                size: 64,
                color: Color(0xFF0F766E),
              ),
              const SizedBox(height: 12),
              const Text(
                "Smart Ambulance System",
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1F2937),
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                "Driver Login",
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF6B7280),
                ),
              ),

              const SizedBox(height: 32),

              // Login Card
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      // Ambulance ID
                      TextField(
                        controller: _ambulanceIdController,
                        decoration: const InputDecoration(
                          labelText: "Ambulance ID",
                          prefixIcon: Icon(Icons.local_shipping),
                          border: OutlineInputBorder(),
                          hintText: "e.g., AMB_001",
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Secret
                      TextField(
                        controller: _secretController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: "Secret",
                          prefixIcon: Icon(Icons.lock),
                          border: OutlineInputBorder(),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Error message
                      if (_errorMessage != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                              color: Colors.red,
                              fontSize: 13,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),

                      // Login Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0F766E),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          onPressed: _isLoading ? null : _handleLogin,
                          child: _isLoading
                              ? const CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                )
                              : const Text(
                                  "Login",
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Footer note
              const Text(
                "Demo: AMB_001 / sec-amb-001",
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
