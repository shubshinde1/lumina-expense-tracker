
import 'package:dio/dio.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final apiServiceProvider = Provider((ref) => ApiService());

class ApiService {
  late final Dio _dio;
  
  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: 'https://wealth-expense-tracker.onrender.com/api',
      connectTimeout: const Duration(seconds: 15),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));
  }

  Future<Response> getDashboardSummary() => _dio.get('/transactions/dashboard');
  Future<Response> getTransactions() => _dio.get('/transactions');
  Future<Response> createTransaction(Map<String, dynamic> data) => _dio.post('/transactions', data: data);
  Future<Response> updateTransaction(String id, Map<String, dynamic> data) => _dio.put('/transactions/$id', data: data);
  Future<Response> deleteTransaction(String id) => _dio.delete('/transactions/$id');
  
  // Categories API
  Future<Response> getCategories() => _dio.get('/categories');
  Future<Response> createCategory(Map<String, dynamic> d) => _dio.post('/categories', data: d);
  Future<Response> updateCategory(String id, Map<String, dynamic> d) => _dio.put('/categories/$id', data: d);
  Future<Response> deleteCategory(String id) => _dio.delete('/categories/$id');
  
  // Subcategories API
  Future<Response> addSubcategory(String catId, String name) => _dio.post('/categories/$catId/subcategories', data: {'name': name});
  Future<Response> updateSubcategory(String catId, String subId, String name) => _dio.put('/categories/$catId/subcategories/$subId', data: {'name': name});
  Future<Response> deleteSubcategory(String catId, String subId) => _dio.delete('/categories/$catId/subcategories/$subId');

  // Auth API
  Future<Response> loginUser(String email, String password) => _dio.post('/auth/login', data: {'email': email, 'password': password});
  Future<Response> requestRegisterOtp(String email) => _dio.post('/auth/register/otp', data: {'email': email});
  Future<Response> registerUser(String name, String email, String password, String otp) => 
      _dio.post('/auth/register', data: {'name': name, 'email': email, 'password': password, 'otp': otp});
  Future<Response> requestResetOtp(String email) => _dio.post('/auth/reset/otp', data: {'email': email});
  Future<Response> resetUserPassword(String email, String otp, String newPassword) => 
      _dio.post('/auth/reset', data: {'email': email, 'otp': otp, 'newPassword': newPassword});
}
