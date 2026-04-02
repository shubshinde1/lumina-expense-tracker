
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:lumina_expense_tracker/models/transaction.dart';
import 'package:lumina_expense_tracker/providers/transaction_provider.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';
import 'package:lumina_expense_tracker/widgets/date_selector.dart';

class HistoryScreen extends HookConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transactionsAsync = ref.watch(transactionsProvider);
    final selectedDate = useState(DateTime.now());

    return Scaffold(
      appBar: AppBar(
        title: const Text('History', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: transactionsAsync.when(
        data: (transactions) {
          // Filter by selected date
          final filtered = transactions.where((tx) {
            return tx.date.day == selectedDate.value.day &&
                tx.date.month == selectedDate.value.month &&
                tx.date.year == selectedDate.value.year;
          }).toList();

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: HorizontalDateSelector(
                  selectedDate: selectedDate.value,
                  onDateChange: (date) => selectedDate.value = date,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.ghost, size: 48, color: AppTheme.textMuted.withOpacity(0.3)),
                            const SizedBox(height: 16),
                            const Text(
                              'Ghost town here',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final tx = filtered[index];
                          return _TransactionItem(tx: tx);
                        },
                      ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}

class _TransactionItem extends StatelessWidget {
  final Transaction tx;
  const _TransactionItem({required this.tx});

  @override
  Widget build(BuildContext context) {
    final color = _getColor(tx.category?.color ?? '#888888');
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Slidable(
        key: ValueKey(tx.id),
        endActionPane: ActionPane(
          motion: const DrawerMotion(),
          children: [
            SlidableAction(
              onPressed: (context) {},
              backgroundColor: AppTheme.surface,
              foregroundColor: Colors.white,
              icon: LucideIcons.edit2,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                bottomLeft: Radius.circular(16),
              ),
            ),
            SlidableAction(
              onPressed: (context) {},
              backgroundColor: Colors.redAccent.withOpacity(0.1),
              foregroundColor: Colors.redAccent,
              icon: LucideIcons.trash2,
              borderRadius: const BorderRadius.only(
                topRight: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
            ),
          ],
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppTheme.cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppTheme.surface),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  _getIcon(tx.category?.icon ?? 'wallet'),
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tx.description ?? tx.category?.name ?? 'Unknown',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${tx.category?.name ?? ''} • ${DateFormat('hh:mm a').format(tx.date)}',
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${tx.type == 'income' ? '+' : '-'}₹${tx.amount.toInt()}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: tx.type == 'income' ? AppTheme.primary : AppTheme.textMain,
                    ),
                  ),
                  Text(
                    tx.paymentMode.toUpperCase(),
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ],
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
