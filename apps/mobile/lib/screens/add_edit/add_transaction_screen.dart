
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lumina_expense_tracker/providers/category_provider.dart';
import 'package:lumina_expense_tracker/providers/transaction_provider.dart';
import 'package:lumina_expense_tracker/services/api_service.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';

class AddTransactionScreen extends HookConsumerWidget {
  const AddTransactionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final type = useState('expense');
    final amount = useTextEditingController();
    final description = useTextEditingController();
    final selectedCategory = useState<String?>(null);
    final selectedDate = useState(DateTime.now());
    final isSaving = useState(false);

    Future<void> save() async {
      if (amount.text.isEmpty || selectedCategory.value == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please fill all fields')),
        );
        return;
      }

      isSaving.value = true;
      try {
        final api = ref.read(apiServiceProvider);
        await api.createTransaction({
          'type': type.value,
          'amount': double.parse(amount.text),
          'description': description.text,
          'category': selectedCategory.value,
          'date': selectedDate.value.toIso8601String(),
          'paymentMode': 'Cash',
        });
        
        // Refresh all relevant providers
        ref.invalidate(transactionsProvider);
        ref.invalidate(dashboardSummaryProvider);
        
        if (context.mounted) Navigator.pop(context);
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to save: $e')),
          );
        }
      } finally {
        isSaving.value = false;
      }
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Add Entry', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Internal Tabs
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.cardBg,
                borderRadius: BorderRadius.circular(30),
              ),
              child: Row(
                children: [
                  _buildTypeTab('expense', 'Expense', type),
                  _buildTypeTab('income', 'Income', type),
                ],
              ),
            ),
            const SizedBox(height: 48),
            // Amount Display
            Column(
              children: [
                const Text(
                  'AMOUNT',
                  style: TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2.0,
                  ),
                ),
                TextField(
                  controller: amount,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 56,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.textMain,
                  ),
                  decoration: InputDecoration(
                    hintText: '0.00',
                    hintStyle: TextStyle(color: AppTheme.textMuted.withOpacity(0.3)),
                    prefixIcon: Padding(
                       padding: const EdgeInsets.only(top: 8),
                       child: Text('₹', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textMuted.withOpacity(0.5))),
                    ),
                    prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
                    border: InputBorder.none,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 48),
            // Transaction Info Box
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.cardBg,
                borderRadius: BorderRadius.circular(32),
                border: Border.all(color: AppTheme.surface),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'CATEGORY',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  categoriesAsync.when(
                    data: (cats) {
                      final filtered = cats.where((c) => c.type == type.value).toList();
                      return GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                        ),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final cat = filtered[index];
                          final isSelected = selectedCategory.value == cat.id;
                          final color = _getColor(cat.color);
                          return GestureDetector(
                            onTap: () => selectedCategory.value = cat.id,
                            child: Container(
                              decoration: BoxDecoration(
                                color: isSelected ? AppTheme.background : AppTheme.background.withOpacity(0.3),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected ? AppTheme.primary : Colors.transparent,
                                  width: 1.5,
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(_getIcon(cat.icon), color: color, size: 18),
                                  const SizedBox(height: 4),
                                  Text(
                                    cat.name,
                                    style: const TextStyle(fontSize: 8, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
                                    textAlign: TextAlign.center,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      );
                    },
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, s) => Text('Error: $e'),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'DESCRIPTION OPTIONAL',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: description,
                    style: const TextStyle(fontSize: 14),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppTheme.background,
                      hintText: 'E.g., Dinner with friends',
                      hintStyle: const TextStyle(color: Color(0xFF666666)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'DATE',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: () async {
                       final d = await showDatePicker(
                         context: context,
                         initialDate: selectedDate.value,
                         firstDate: DateTime(2000),
                         lastDate: DateTime(2100),
                       );
                       if (d != null) selectedDate.value = d;
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppTheme.background,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Icon(LucideIcons.calendar, size: 16, color: AppTheme.primary),
                          const SizedBox(width: 8),
                          Text(
                            DateFormat('EEEE, MMM d, y').format(selectedDate.value),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 64,
              child: ElevatedButton(
                onPressed: isSaving.value ? null : save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  elevation: 0,
                ),
                child: isSaving.value
                    ? const CircularProgressIndicator(color: Colors.black)
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(LucideIcons.save, size: 20),
                          const SizedBox(width: 12),
                          Text(
                            'Record ${type.value == 'income' ? 'Income' : 'Expense'}',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeTab(String id, String label, ValueNotifier<String> type) {
    final isSelected = type.value == id;
    final primaryColor = type.value == 'expense' ? AppTheme.destructive : AppTheme.primary;
    
    return Expanded(
      child: GestureDetector(
        onTap: () => type.value = id,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.background : Colors.transparent,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: isSelected ? (id == 'expense' ? Colors.redAccent : AppTheme.primary) : AppTheme.textMuted,
            ),
          ),
        ),
      ),
    );
  }

  Color _getColor(String hex) {
    try {
      return Color(int.parse(hex.replaceFirst('#', '0xFF')));
    } catch (_) {
      return AppTheme.primary;
    }
  }

  // Helper should probably be in utils
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
