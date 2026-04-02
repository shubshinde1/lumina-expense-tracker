
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lumina_expense_tracker/services/api_service.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';

class SignupScreen extends HookConsumerWidget {
  const SignupScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final step = useState(1);
    final email = useTextEditingController();
    final name = useTextEditingController();
    final password = useTextEditingController();
    final otp = useTextEditingController();
    final isLoading = useState(false);

    Future<void> requestOtp() async {
      if (email.text.isEmpty) return;
      isLoading.value = true;
      try {
        await ref.read(apiServiceProvider).requestRegisterOtp(email.text.trim());
        step.value = 2;
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: ${e.toString()}')));
        }
      } finally {
        isLoading.value = false;
      }
    }

    Future<void> completeSignup() async {
      if (otp.text.isEmpty || password.text.length < 6) return;
      isLoading.value = true;
      try {
        await ref.read(apiServiceProvider).registerUser(
              name.text.trim(),
              email.text.trim(),
              password.text,
              otp.text.trim(),
            );
        if (context.mounted) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account created! Please login.')));
           Navigator.pop(context); // Go back to login
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: ${e.toString()}')));
        }
      } finally {
        isLoading.value = false;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('New Account'),
        leading: IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(LucideIcons.arrowLeft)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Create One', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
            const Text('Start tracking your wealth today.', style: TextStyle(color: AppTheme.textMuted)),
            const SizedBox(height: 48),
            
            if (step.value == 1) ...[
               TextField(
                controller: email,
                style: const TextStyle(fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Email Address',
                  prefixIcon: const Icon(LucideIcons.mail, size: 18),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity, height: 56,
                child: ElevatedButton(
                  onPressed: isLoading.value ? null : requestOtp,
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: isLoading.value ? const CircularProgressIndicator() : const Text('Send OTP', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ] else ...[
               TextField(
                controller: name,
                style: const TextStyle(fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Full Name',
                  prefixIcon: const Icon(LucideIcons.user, size: 18),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: password,
                obscureText: true,
                style: const TextStyle(fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Create Password',
                  prefixIcon: const Icon(LucideIcons.lock, size: 18),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: otp,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 8),
                maxLength: 6,
                decoration: InputDecoration(
                  labelText: 'Enter OTP sent via Email',
                  floatingLabelBehavior: FloatingLabelBehavior.always,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity, height: 56,
                child: ElevatedButton(
                  onPressed: isLoading.value ? null : completeSignup,
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: isLoading.value ? const CircularProgressIndicator() : const Text('Complete Cleanup', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
