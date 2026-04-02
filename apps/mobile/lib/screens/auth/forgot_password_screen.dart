
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lumina_expense_tracker/services/api_service.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';

class ForgotPasswordScreen extends HookConsumerWidget {
  const ForgotPasswordScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final step = useState(1);
    final email = useTextEditingController();
    final newPassword = useTextEditingController();
    final otp = useTextEditingController();
    final isLoading = useState(false);

    Future<void> requestRestOtp() async {
      if (email.text.isEmpty) return;
      isLoading.value = true;
      try {
        await ref.read(apiServiceProvider).requestResetOtp(email.text.trim());
        step.value = 2;
      } catch (e) {
        if (context.mounted) {
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: ${e.toString()}')));
        }
      } finally {
        isLoading.value = false;
      }
    }

    Future<void> completeReset() async {
      if (otp.text.isEmpty || newPassword.text.length < 6) return;
      isLoading.value = true;
      try {
        await ref.read(apiServiceProvider).resetUserPassword(
              email.text.trim(),
              otp.text.trim(),
              newPassword.text,
            );
        if (context.mounted) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password Reset Successful! Please login.')));
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
        title: const Text('Reset Access'),
        leading: IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(LucideIcons.arrowLeft)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Forgot Password?', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
            const Text('Enter your email to request recovery.', style: TextStyle(color: AppTheme.textMuted)),
            const SizedBox(height: 48),
            
            if (step.value == 1) ...[
               TextField(
                controller: email,
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
                  onPressed: isLoading.value ? null : requestRestOtp,
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: isLoading.value ? const CircularProgressIndicator() : const Text('Send Recovery OTP', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ] else ...[
               TextField(
                controller: newPassword,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'New Password',
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
                  onPressed: isLoading.value ? null : completeReset,
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: isLoading.value ? const CircularProgressIndicator() : const Text('Confirm Recovery', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
