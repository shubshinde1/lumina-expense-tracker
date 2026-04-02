
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lumina_expense_tracker/services/api_service.dart';

final authProvider = StateNotifierProvider<AuthNotifier, User?>((ref) {
  return AuthNotifier();
});

class User {
  final String id;
  final String name;
  final String email;
  final String token;
  final String plan;

  User({required this.id, required this.name, required this.email, required this.token, required this.plan});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'],
      name: json['name'],
      email: json['email'],
      token: json['token'],
      plan: json['plan'] ?? 'free',
    );
  }
}

class AuthNotifier extends StateNotifier<User?> {
  AuthNotifier() : super(null) {
    _loadUser();
  }

  void _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null) {
      // Potentially fetch user profile? For now just assume token exists implies login
      // Actually we'd need ID/Email to reconstruct the User object.
      // Better to store JSON.
    }
  }

  void login(Map<String, dynamic> userData) async {
    final prefs = await SharedPreferences.getInstance();
    final user = User.fromJson(userData);
    await prefs.setString('token', user.token);
    state = user;
  }

  void logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    state = null;
  }
}
