import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lumina_expense_tracker/theme/app_theme.dart';

class HorizontalDateSelector extends StatefulWidget {
  final DateTime selectedDate;
  final Function(DateTime) onDateChange;

  const HorizontalDateSelector({
    super.key,
    required this.selectedDate,
    required this.onDateChange,
  });

  @override
  State<HorizontalDateSelector> createState() => _HorizontalDateSelectorState();
}

class _HorizontalDateSelectorState extends State<HorizontalDateSelector> {
  late DateTime _currentMonth;
  late List<DateTime> _pastMonths;
  final ScrollController _monthController = ScrollController();
  final ScrollController _dayController = ScrollController();

  @override
  void initState() {
    super.initState();
    _currentMonth = DateTime(widget.selectedDate.year, widget.selectedDate.month, 1);
    _pastMonths = List.generate(
      24,
      (i) => DateTime(DateTime.now().year, DateTime.now().month - i, 1),
    );
  }

  void _resetToToday() {
    final now = DateTime.now();
    setState(() {
      _currentMonth = DateTime(now.year, now.month, 1);
    });
    widget.onDateChange(now);
    
    // Smooth scroll back to start
    _monthController.animateTo(0, duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
    // Rough estimation for day scroll back to today
    _dayController.animateTo(0, duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
  }

  @override
  Widget build(BuildContext context) {
    final daysInMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 0).day;
    final allDays = List.generate(
      daysInMonth,
      (i) => DateTime(_currentMonth.year, _currentMonth.month, i + 1),
    );

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0C0E),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF161B18)),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Column(
            children: [
              // Month Row
              SizedBox(
                height: 55,
                child: ListView.builder(
                  controller: _monthController,
                  scrollDirection: Axis.horizontal,
                  itemCount: _pastMonths.length,
                  itemBuilder: (context, index) {
                    final monthDate = _pastMonths[index];
                    final isSelected = monthDate.month == _currentMonth.month && 
                                       monthDate.year == _currentMonth.year;
                    final isYearHeader = index == 0 || monthDate.month == 12 || monthDate.year != _pastMonths[index-1].year;
                    
                    return Row(
                      children: [
                        if (isYearHeader) 
                          Container(
                            width: 48,
                            alignment: Alignment.center,
                            decoration: const BoxDecoration(
                              color: Color(0xFF0C120E),
                              border: Border(right: BorderSide(color: Color(0xFF161B18))),
                            ),
                            child: RotatedBox(
                              quarterTurns: -1,
                              child: Text(
                                monthDate.year.toString(),
                                style: const TextStyle(
                                  color: AppTheme.primary,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 2,
                                ),
                              ),
                            ),
                          ),
                        GestureDetector(
                          onTap: () => setState(() => _currentMonth = monthDate),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              DateFormat('MMM').format(monthDate),
                              style: TextStyle(
                                color: isSelected ? Colors.white : const Color(0xFF666666),
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              const Divider(height: 1, color: Color(0xFF161B18)),
              // Days Row
              SizedBox(
                height: 68,
                child: ListView.builder(
                  controller: _dayController,
                  scrollDirection: Axis.horizontal,
                  itemCount: allDays.length,
                  padding: const EdgeInsets.only(left: 48), // align with month sticky border
                  itemBuilder: (context, index) {
                    final dayDate = allDays[index];
                    final isSelected = dayDate.day == widget.selectedDate.day &&
                        dayDate.month == widget.selectedDate.month &&
                        dayDate.year == widget.selectedDate.year;

                    return GestureDetector(
                      onTap: () => widget.onDateChange(dayDate),
                      child: Container(
                        width: 50,
                        margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primary : const Color(0xFF181A1E),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: isSelected ? [
                            BoxShadow(
                              color: AppTheme.primary.withOpacity(0.2),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            )
                          ] : null,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              DateFormat('EEE').format(dayDate).toUpperCase(),
                              style: TextStyle(
                                color: isSelected ? Colors.black.withOpacity(0.6) : const Color(0xFF666666),
                                fontSize: 8,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              dayDate.day.toString(),
                              style: TextStyle(
                                color: isSelected ? Colors.black : Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
          // Sticky Week label overlay placeholder
          Positioned(
            left: 0,
            bottom: 0,
            top: 56,
            child: Container(
               width: 48,
               alignment: Alignment.center,
               decoration: const BoxDecoration(
                  color: Color(0xFF0C120E),
                  border: Border(right: BorderSide(color: Color(0xFF161B18))),
               ),
               child: const RotatedBox(
                  quarterTurns: -1,
                  child: Text(
                     "WEEKS",
                     style: TextStyle(color: AppTheme.primary, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 1),
                  ),
               ),
            ),
          ),
          // Reset Button
          Positioned(
            left: 48,
            top: 55,
            child: Transform.translate(
              offset: const Offset(-14, -14),
              child: GestureDetector(
                onTap: _resetToToday,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: const Color(0xFF181A1E),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF2A2D35), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.6),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: const Icon(LucideIcons.rotateCcw, color: Color(0xFF888888), size: 12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
