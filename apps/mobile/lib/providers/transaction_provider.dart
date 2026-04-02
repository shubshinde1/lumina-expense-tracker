
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lumina_expense_tracker/models/transaction.dart';
import 'package:lumina_expense_tracker/services/api_service.dart';

final transactionsProvider = FutureProvider<List<Transaction>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final response = await api.getTransactions();
  return (response.data as List).map((e) => Transaction.fromJson(e)).toList();
});

final dashboardSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final response = await api.getDashboardSummary();
  return response.data;
});
