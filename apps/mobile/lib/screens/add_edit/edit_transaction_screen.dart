
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lumina_expense_tracker/models/transaction.dart';
import 'package:lumina_expense_tracker/providers/category_provider.dart';
import 'package:lumina_expense_tracker/providers/transaction_provider.dart';
import 'package:lumina_expense_tracker/services/api_service.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';

class EditTransactionScreen extends HookConsumerWidget {
  final Transaction transaction;
  const EditTransactionScreen({super.key, required this.transaction});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final type = useState(transaction.type);
    final amount = useTextEditingController(text: transaction.amount.toString());
    final description = useTextEditingController(text: transaction.description);
    final selectedCategory = useState<String?>(transaction.category?.id);
    final selectedDate = useState(transaction.date);
    final isSaving = useState(false);

    Future<void> update() async {
      if (amount.text.isEmpty || selectedCategory.value == null) return;
      isSaving.value = true;
      try {
        await ref.read(apiServiceProvider).updateTransaction(transaction.id, {
          'type': type.value,
          'amount': double.parse(amount.text),
          'description': description.text,
          'category': selectedCategory.value,
          'date': selectedDate.value.toIso8601String(),
        });
        ref.invalidate(transactionsProvider);
        ref.invalidate(dashboardSummaryProvider);
        if (context.mounted) Navigator.pop(context);
      } catch (_) {} finally {
        isSaving.value = false;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Entry', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
             // Types... copy-paste logic from Add.
             Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: AppTheme.cardBg, borderRadius: BorderRadius.circular(30)),
              child: Row(children: [
                _buildTypeTab('expense', 'Expense', type),
                _buildTypeTab('income', 'Income', type),
              ]),
            ),
            const SizedBox(height: 32),
            // Amount
            TextField(
              controller: amount,
              textAlign: TextAlign.center,
              keyboardType: TextInputType.number,
              style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold),
              decoration: const InputDecoration(border: InputBorder.none, prefixText: '₹'),
            ),
            const SizedBox(height: 32),
            // Categories grid... same as Add
             categoriesAsync.when(
               data: (cats) {
                  final filtered = cats.where((c) => c.type == type.value).toList();
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 4, mainAxisSpacing: 8, crossAxisSpacing: 8),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                       final cat = filtered[index];
                       final isSelected = selectedCategory.value == cat.id;
                       return GestureDetector(
                          onTap: () => selectedCategory.value = cat.id,
                          child: Container(
                             decoration: BoxDecoration(
                               color: isSelected ? AppTheme.primary.withOpacity(0.1) : AppTheme.background,
                               borderRadius: BorderRadius.circular(16),
                               border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.surface),
                             ),
                             child: Column(
                               mainAxisAlignment: MainAxisAlignment.center,
                               children: [
                                  Icon(_getIcon(cat.icon), color: _getColor(cat.color), size: 18),
                                  Text(cat.name, style: const TextStyle(fontSize: 8, color: AppTheme.textMuted), overflow: TextOverflow.ellipsis),
                               ],
                             ),
                          ),
                       );
                    }
                  );
               },
               loading: () => const CircularProgressIndicator(),
               error: (e, s) => Text('Error: $e'),
             ),
             const SizedBox(height: 32),
             TextField(
               controller: description,
               decoration: InputDecoration(
                 hintText: 'Description',
                 filled: true,
                 fillColor: AppTheme.cardBg,
                 border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
               ),
             ),
             const SizedBox(height: 32),
             SizedBox(
               width: double.infinity,
               height: 60,
               child: ElevatedButton(
                 onPressed: isSaving.value ? null : update,
                 style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))),
                 child: isSaving.value ? const CircularProgressIndicator() : const Text('Update Transaction', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
               ),
             ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeTab(String id, String label, ValueNotifier<String> type) {
    final isSelected = type.value == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => type.value = id,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(color: isSelected ? AppTheme.background : Colors.transparent, borderRadius: BorderRadius.circular(24)),
          child: Text(label, textAlign: TextAlign.center, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: isSelected ? (id == 'expense' ? Colors.redAccent : AppTheme.primary) : AppTheme.textMuted)),
        ),
      ),
    );
  }

  // Helpers
  Color _getColor(String hex) {
    try { return Color(int.parse(hex.replaceFirst('#', '0xFF'))); } catch (_) { return AppTheme.primary; }
  }
  IconData _getIcon(String icon) {
    switch (icon) {
      case 'shopping_cart': return LucideIcons.shoppingCart;
      case 'restaurant': return LucideIcons.utensils;
      case 'directions_car': return LucideIcons.car;
      case 'home': return LucideIcons.home;
      case 'movie': return LucideIcons.clapperboard;
      case 'hospital': return LucideIcons.stethoscope;
      case 'wallet': return LucideIcons.wallet;
      default: return LucideIcons.banknote;
    }
  }
}
