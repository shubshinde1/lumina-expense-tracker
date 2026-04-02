
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lumina_expense_tracker/models/transaction.dart';
import 'package:lumina_expense_tracker/services/api_service.dart';

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final response = await api.getCategories();
  return (response.data as List).map((e) => Category.fromJson(e)).toList();
});
