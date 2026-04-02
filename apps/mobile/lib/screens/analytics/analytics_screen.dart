
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:lumina_expense_tracker/models/transaction.dart';
import 'package:lumina_expense_tracker/providers/transaction_provider.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';

class AnalyticsScreen extends HookConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transactionsAsync = ref.watch(transactionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: transactionsAsync.when(
        data: (transactions) {
          final summary = _calculateSummary(transactions);
          
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Quick Summary Cards
                Row(
                  children: [
                    _MetricCard(title: 'INCOME', amount: summary.totalIncome, color: AppTheme.primary, icon: LucideIcons.trendingUp),
                    const SizedBox(width: 12),
                    _MetricCard(title: 'EXPENSE', amount: summary.totalExpense, color: Colors.orangeAccent, icon: LucideIcons.trendingDown),
                  ],
                ),
                const SizedBox(height: 24),
                // Spending by Category (Pie Chart)
                _SectionTitle(title: 'SPENDING BY CATEGORY', icon: LucideIcons.pieChart),
                const SizedBox(height: 16),
                Container(
                  height: 280,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppTheme.cardBg,
                    borderRadius: BorderRadius.circular(32),
                    border: Border.all(color: AppTheme.surface),
                  ),
                  child: summary.pieData.isEmpty 
                    ? const Center(child: Text('No data available', style: TextStyle(color: AppTheme.textMuted)))
                    : PieChart(
                        PieChartData(
                          sectionsSpace: 4,
                          centerSpaceRadius: 50,
                          sections: summary.pieData.map((e) => PieChartSectionData(
                            value: e.value,
                            title: '',
                            color: e.color,
                            radius: 20,
                          )).toList(),
                        ),
                      ),
                ),
                const SizedBox(height: 24),
                // Cash Flow Trend (Area Chart Placeholder style)
                _SectionTitle(title: 'CASH FLOW TREND', icon: LucideIcons.activity),
                const SizedBox(height: 16),
                Container(
                  height: 200,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppTheme.cardBg,
                    borderRadius: BorderRadius.circular(32),
                    border: Border.all(color: AppTheme.surface),
                  ),
                  child: LineChart(
                    LineChartData(
                       gridData: const FlGridData(show: false),
                       titlesData: const FlTitlesData(show: false),
                       borderData: FlBorderData(show: false),
                       lineBarsData: [
                         LineChartBarData(
                           spots: const [
                             FlSpot(0, 3),
                             FlSpot(2.6, 2),
                             FlSpot(4.9, 5),
                             FlSpot(6.8, 3.1),
                             FlSpot(8, 4),
                             FlSpot(9.5, 3),
                             FlSpot(11, 4),
                           ],
                           isCurved: true,
                           color: AppTheme.primary,
                           barWidth: 3,
                           dotData: const FlDotData(show: false),
                           belowBarData: BarAreaData(
                             show: true,
                             color: AppTheme.primary.withOpacity(0.1),
                           ),
                         ),
                       ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: $e')),
      ),
    );
  }

  _AnalyticsSummary _calculateSummary(List<Transaction> txs) {
    double income = 0;
    double expense = 0;
    Map<String, double> catMap = {};
    Map<String, Color> colorMap = {};

    for (var tx in txs) {
      if (tx.type == 'income') {
        income += tx.amount;
      } else {
        expense += tx.amount;
        final name = tx.category?.name ?? 'Other';
        catMap[name] = (catMap[name] ?? 0) + tx.amount;
        colorMap[name] = _getColor(tx.category?.color ?? '#4ADE80');
      }
    }

    final pieData = catMap.entries.map((e) => _PieEntry(e.value, colorMap[e.key]!)).toList();
    
    return _AnalyticsSummary(totalIncome: income, totalExpense: expense, pieData: pieData);
  }

  Color _getColor(String hex) {
    try {
      return Color(int.parse(hex.replaceFirst('#', '0xFF')));
    } catch (_) {
      return AppTheme.primary;
    }
  }
}

class _AnalyticsSummary {
  final double totalIncome;
  final double totalExpense;
  final List<_PieEntry> pieData;
  _AnalyticsSummary({required this.totalIncome, required this.totalExpense, required this.pieData});
}

class _PieEntry {
  final double value;
  final Color color;
  _PieEntry(this.value, this.color);
}

class _MetricCard extends StatelessWidget {
  final String title;
  final double amount;
  final Color color;
  final IconData icon;

  const _MetricCard({required this.title, required this.amount, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppTheme.surface),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 14),
                const SizedBox(width: 4),
                Text(title, style: const TextStyle(color: AppTheme.textMuted, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 1)),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '₹${amount.toInt().toString()}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final IconData icon;
  const _SectionTitle({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primary, size: 14),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5),
        ),
      ],
    );
  }
}
