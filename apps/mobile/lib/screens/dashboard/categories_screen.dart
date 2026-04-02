
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lumina_expense_tracker/models/transaction.dart';
import 'package:lumina_expense_tracker/providers/category_provider.dart';
import 'package:lumina_expense_tracker/services/api_service.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';

class CategoriesScreen extends HookConsumerWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final isAdding = useState(false);
    
    // Create states
    final newCatName = useTextEditingController();
    final newCatType = useState('expense');
    final newCatIcon = useState('wallet');
    final newCatColor = useState('#4ADE80');
    final isSaving = useState(false);

    Future<void> saveCategory() async {
      if (newCatName.text.isEmpty) return;
      isSaving.value = true;
      try {
        await ref.read(apiServiceProvider).createCategory({
          'name': newCatName.text,
          'type': newCatType.value,
          'icon': newCatIcon.value,
          'color': newCatColor.value,
        });
        ref.invalidate(categoriesProvider);
        newCatName.clear();
        isAdding.value = false;
      } catch (_) {} finally {
        isSaving.value = false;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Categories', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            onPressed: () => isAdding.value = !isAdding.value,
            icon: Icon(isAdding.value ? LucideIcons.x : LucideIcons.plus, color: AppTheme.primary),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            if (isAdding.value) ...[
              _AddCategoryForm(
                name: newCatName,
                type: newCatType,
                icon: newCatIcon,
                color: newCatColor,
                isSaving: isSaving.value,
                onSave: saveCategory,
              ),
              const SizedBox(height: 24),
            ],
            categoriesAsync.when(
              data: (cats) => ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: cats.length,
                itemBuilder: (context, index) {
                  final cat = cats[index];
                  return _CategoryTile(cat: cat);
                },
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, s) => Center(child: Text('Error: $e')),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryTile extends HookConsumerWidget {
  final Category cat;
  const _CategoryTile({required this.cat});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isExpanded = useState(false);
    final subController = useTextEditingController();

    return Column(
      children: [
        GestureDetector(
          onTap: () => isExpanded.value = !isExpanded.value,
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.cardBg,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppTheme.surface),
            ),
            child: Row(
              children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    color: _getColor(cat.color).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(_getIcon(cat.icon), color: _getColor(cat.color), size: 20),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(cat.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text(cat.type.toUpperCase(), style: const TextStyle(fontSize: 9, color: AppTheme.textMuted, letterSpacing: 1)),
                    ],
                  ),
                ),
                Icon(isExpanded.value ? LucideIcons.chevronUp : LucideIcons.chevronDown, size: 16, color: AppTheme.textMuted),
              ],
            ),
          ),
        ),
        if (isExpanded.value) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            margin: const EdgeInsets.only(bottom: 16),
            child: Column(
              children: [
                if (cat.subcategories != null)
                   ...cat.subcategories!.map((s) => _SubcategoryItem(cat: cat, sub: s)),
                const SizedBox(height: 8),
                TextField(
                   controller: subController,
                   style: const TextStyle(fontSize: 13),
                   decoration: InputDecoration(
                     hintText: 'Add new type...',
                     hintStyle: const TextStyle(color: AppTheme.textMuted),
                     suffixIcon: IconButton(
                       onPressed: () async {
                         if (subController.text.isNotEmpty) {
                            await ref.read(apiServiceProvider).addSubcategory(cat.id, subController.text);
                            ref.invalidate(categoriesProvider);
                            subController.clear();
                         }
                       }, 
                       icon: const Icon(LucideIcons.plus, size: 16)
                     ),
                     border: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.surface)),
                   ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: () async {
                         final confirm = await _showDeleteConfirm(context);
                         if (confirm == true) {
                            await ref.read(apiServiceProvider).deleteCategory(cat.id);
                            ref.invalidate(categoriesProvider);
                         }
                      },
                      icon: const Icon(LucideIcons.trash2, size: 14),
                      label: const Text('Delete Category', style: TextStyle(fontSize: 10)),
                      style: TextButton.styleFrom(foregroundColor: AppTheme.destructive),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Future<bool?> _showDeleteConfirm(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Category?'),
        content: const Text('This will permanently delete this category and all related data.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            child: const Text('Delete', style: TextStyle(color: Colors.red))
          ),
        ],
      ),
    );
  }
}

class _SubcategoryItem extends HookConsumerWidget {
  final Category cat;
  final Subcategory sub;
  const _SubcategoryItem({required this.cat, required this.sub});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(LucideIcons.cornerDownRight, size: 10, color: AppTheme.textMuted),
          const SizedBox(width: 8),
          Text(sub.name, style: const TextStyle(fontSize: 12)),
          const Spacer(),
          IconButton(
            onPressed: () async {
               await ref.read(apiServiceProvider).deleteSubcategory(cat.id, sub.id);
               ref.invalidate(categoriesProvider);
            }, 
            icon: const Icon(LucideIcons.trash2, size: 12, color: AppTheme.textMuted)
          ),
        ],
      ),
    );
  }
}

class _AddCategoryForm extends StatelessWidget {
  final TextEditingController name;
  final ValueNotifier<String> type;
  final ValueNotifier<String> icon;
  final ValueNotifier<String> color;
  final bool isSaving;
  final VoidCallback onSave;

  const _AddCategoryForm({required this.name, required this.type, required this.icon, required this.color, required this.isSaving, required this.onSave});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('New Category', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 16),
          TextField(
            controller: name,
            decoration: InputDecoration(
              hintText: 'Work Expense, Groceries...',
              fillColor: AppTheme.background,
              filled: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 16),
          // Type Toggle
          Row(
            children: [
              _buildTypeBtn('expense', 'Expense', type),
              const SizedBox(width: 12),
              _buildTypeBtn('income', 'Income', type),
            ],
          ),
          const SizedBox(height: 16),
          // Icon & Color
          Row(
             children: [
                Expanded(
                  child: Container(
                    height: 56,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(color: AppTheme.background, borderRadius: BorderRadius.circular(16)),
                    child: Row(
                      children: [
                        Icon(_getIcon(icon.value), color: _getColor(color.value), size: 20),
                        const SizedBox(width: 12),
                        const Text('Icon Set', style: TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                ),
             ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed: isSaving ? null : onSave,
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              child: isSaving ? const CircularProgressIndicator() : const Text('Create Category', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypeBtn(String id, String label, ValueNotifier<String> currentType) {
    final isSelected = currentType.value == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => currentType.value = id,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primary.withOpacity(0.1) : AppTheme.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.surface),
          ),
          child: Text(label, textAlign: TextAlign.center, style: TextStyle(color: isSelected ? AppTheme.primary : AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }
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
