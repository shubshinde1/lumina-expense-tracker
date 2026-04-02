
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lumina_expense_tracker/providers/theme_provider.dart';
import 'package:lumina_expense_tracker/providers/transaction_provider.dart';
import 'package:lumina_expense_tracker/screens/add_edit/add_transaction_screen.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';

class DashboardScreen extends HookConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(dashboardSummaryProvider);
    final themeMode = ref.watch(themeProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
             Text(
              'Good Morning,',
              style: TextStyle(
                fontSize: 10,
                color: AppTheme.textMuted,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
              ),
            ),
            const Text(
              'User 👋',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => ref.read(themeProvider.notifier).toggleTheme(),
            icon: Icon(
              themeMode == ThemeMode.dark ? LucideIcons.moon : LucideIcons.sun,
              color: AppTheme.primary,
              size: 20,
            ),
          ),
          Container(
            margin: const EdgeInsets.only(right: 16, left: 8),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.cardBg,
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.surface),
            ),
            child: const Icon(LucideIcons.wallet, color: AppTheme.primary, size: 20),
          ),
        ],
      ),
      body: summaryAsync.when(
        data: (summary) {
          final balance = (summary['balance'] as num).toDouble();
          final income = (summary['income'] as num).toDouble();
          final expense = (summary['expense'] as num).toDouble();
          final recent = summary['recentTransactions'] as List;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Balance Card
                _BalanceCard(balance: balance, income: income, expense: expense),
                const SizedBox(height: 24),
                // Quick Actions
                Row(
                  children: [
                    _QuickActionCard(
                      icon: LucideIcons.plusCircle,
                      label: 'Add New',
                      color: AppTheme.primary,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const AddTransactionScreen()),
                      ),
                    ),
                    const SizedBox(width: 16),
                    _QuickActionCard(
                      icon: LucideIcons.pieChart,
                      label: 'Analytics',
                      color: Colors.blueAccent,
                      onTap: () {
                         // Tab changes are managed by indexed stack in main. 
                         // Accessing state here is harder without a global navigation provider.
                         // But we can just push it for now or rely on bottom nav.
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                const Text(
                  'RECENT ACTIVITY',
                  style: TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 16),
                ...recent.take(5).map((tx) => _RecentItem(tx: tx)),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, s) => Center(child: Text('Error: $e')),
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final double balance;
  final double income;
  final double expense;
  const _BalanceCard({required this.balance, required this.income, required this.expense});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primary.withOpacity(0.95), const Color(0xFF109048)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withOpacity(0.2),
            offset: const Offset(0, 15),
            blurRadius: 30,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'AVAILABLE BALANCE',
            style: TextStyle(color: Colors.black.withOpacity(0.6), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 2.0),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('₹', style: TextStyle(color: Colors.black.withOpacity(0.6), fontSize: 24, fontWeight: FontWeight.bold, height: 1.6)),
              const SizedBox(width: 4),
              Text(
                balance.toStringAsFixed(0).replaceFirstMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},'),
                style: const TextStyle(color: Colors.black, fontSize: 44, fontWeight: FontWeight.w900),
              ),
            ],
          ),
          const SizedBox(height: 28),
          Row(
            children: [
              _BalanceMetric(label: 'TOTAL INCOME', amount: income, color: Colors.white),
              const SizedBox(width: 12),
              _BalanceMetric(label: 'TOTAL SPENT', amount: expense, color: Colors.black),
            ],
          ),
        ],
      ),
    );
  }
}

class _BalanceMetric extends StatelessWidget {
  final String label;
  final double amount;
  final Color color;
  const _BalanceMetric({required this.label, required this.amount, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.1),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: color.withOpacity(0.8), fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 4),
            Text(
              '₹${amount.toInt().toString()}',
              style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickActionCard({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppTheme.surface),
          ),
          child: Column(
            children: [
              Container(
                 padding: const EdgeInsets.all(10),
                 decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
                 child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(height: 12),
              Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentItem extends StatelessWidget {
  final Map<String, dynamic> tx;
  const _RecentItem({required this.tx});

  @override
  Widget build(BuildContext context) {
    final cat = tx['category'] as Map<String, dynamic>?;
    final color = Color(int.parse((cat?['color'] ?? '#888888').toString().replaceFirst('#', '0xFF')));
    final amount = (tx['amount'] as num).toDouble();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.surface),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
            child: Icon(LucideIcons.wallet, color: color, size: 16),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
               crossAxisAlignment: CrossAxisAlignment.start,
               children: [
                  Text(tx['description'] ?? cat?['name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(cat?['name'] ?? '', style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
               ],
            ),
          ),
          Text(
            '${tx['type'] == 'income' ? '+' : '-'}₹${amount.toInt()}',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: tx['type'] == 'income' ? AppTheme.primary : AppTheme.textMain),
          ),
        ],
      ),
    );
  }
}
