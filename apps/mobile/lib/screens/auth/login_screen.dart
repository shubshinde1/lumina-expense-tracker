
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lumina_expense_tracker/providers/auth_provider.dart';
import 'package:lumina_expense_tracker/services/api_service.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';
import 'package:lumina_expense_tracker/screens/auth/signup_screen.dart';
import 'package:lumina_expense_tracker/screens/auth/forgot_password_screen.dart';

class LoginScreen extends HookConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final email = useTextEditingController();
    final password = useTextEditingController();
    final isLoading = useState(false);
    final obscure = useState(true);

    Future<void> login() async {
      if (email.text.isEmpty || password.text.isEmpty) return;
      isLoading.value = true;
      try {
        final response = await ref.read(apiServiceProvider).loginUser(email.text.trim(), password.text);
        ref.read(authProvider.notifier).login(response.data);
      } catch (e) {
         if (context.mounted) {
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Login failed: ${e.toString()}')));
         }
      } finally {
        isLoading.value = false;
      }
    }

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 64),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
               Container(
                width: 64, height: 64,
                decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                child: const Icon(LucideIcons.wallet, color: AppTheme.primary, size: 32),
              ),
              const SizedBox(height: 32),
              const Text('Welcome Back', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
              const Text('Sign in to continue your journey.', style: TextStyle(color: AppTheme.textMuted)),
              const SizedBox(height: 48),
              
              TextField(
                controller: email,
                style: const TextStyle(fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Email',
                  prefixIcon: const Icon(LucideIcons.mail, size: 18),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: password,
                obscureText: obscure.value,
                style: const TextStyle(fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(LucideIcons.lock, size: 18),
                  suffixIcon: IconButton(onPressed: () => obscure.value = !obscure.value, icon: Icon(obscure.value ? LucideIcons.eye : LucideIcons.eyeOff, size: 18)),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())), 
                  child: const Text('Forgot Password?', style: TextStyle(color: AppTheme.primary, fontSize: 13))
                ),
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity, height: 56,
                child: ElevatedButton(
                  onPressed: isLoading.value ? null : login,
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: isLoading.value ? const CircularProgressIndicator() : const Text('Sign In', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Don't have an account?", style: TextStyle(color: AppTheme.textMuted)),
                  TextButton(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SignupScreen())), 
                    child: const Text('Sign Up', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold))
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
