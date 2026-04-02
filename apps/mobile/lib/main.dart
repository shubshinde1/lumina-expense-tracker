
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';
import 'package:lumina_expense_tracker/screens/dashboard/dashboard_screen.dart';
import 'package:lumina_expense_tracker/screens/history/history_screen.dart';
import 'package:lumina_expense_tracker/screens/analytics/analytics_screen.dart';
import 'package:lumina_expense_tracker/screens/dashboard/categories_screen.dart';
import 'package:lumina_expense_tracker/screens/auth/login_screen.dart';
import 'package:lumina_expense_tracker/providers/theme_provider.dart';
import 'package:lumina_expense_tracker/providers/auth_provider.dart';
import 'package:lucide_icons/lucide_icons.dart';

void main() {
  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);
    final user = ref.watch(authProvider);
    
    return MaterialApp(
      title: 'Lumina Expense Tracker',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      home: user == null ? const LoginScreen() : const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  final List<Widget> _screens = [
    const DashboardScreen(),
    const HistoryScreen(),
    const AnalyticsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: _buildDrawer(),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        height: 70,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: AppTheme.surface, width: 0.5),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildNavItem(LucideIcons.layoutDashboard, 'Dash', 0),
            _buildNavItem(LucideIcons.list, 'History', 1),
            _buildNavItem(LucideIcons.pieChart, 'Analytics', 2),
            _buildNavItem(LucideIcons.menu, 'Menu', 3, isDrawer: true),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: AppTheme.background,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                 const Text('Lumina', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                 Text('Expense Tracker Pro', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, letterSpacing: 1.5)),
              ],
            ),
          ),
          _drawerItem(LucideIcons.box, 'Manage Categories', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CategoriesScreen()))),
          _drawerItem(LucideIcons.settings, 'Settings', () {}),
          _drawerItem(LucideIcons.info, 'About App', () {}),
          const Divider(color: AppTheme.surface),
          Consumer(builder: (context, ref, _) {
            return _drawerItem(LucideIcons.logOut, 'Logout', () {
               ref.read(authProvider.notifier).logout();
            }, color: AppTheme.destructive);
          }),
        ],
      ),
    );
  }

  Widget _drawerItem(IconData icon, String title, VoidCallback onTap, {Color? color}) {
    return ListTile(
      leading: Icon(icon, color: color ?? AppTheme.textMuted, size: 20),
      title: Text(title, style: TextStyle(color: color ?? AppTheme.textMain, fontWeight: FontWeight.bold, fontSize: 14)),
      onTap: () {
        Navigator.pop(context); // Close drawer
        onTap();
      },
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index, {bool isDrawer = false}) {
    final bool isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () {
        if (isDrawer) {
          _scaffoldKey.currentState?.openDrawer();
        } else {
          setState(() => _currentIndex = index);
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? AppTheme.primary : AppTheme.textMuted,
              size: 20,
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
