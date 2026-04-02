
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color background = Color(0xFF0A0C0E);
  static const Color cardBg = Color(0xFF161B18);
  static const Color primary = Color(0xFF4ADE80);
  static const Color surface = Color(0xFF1B261D);
  static const Color accent = Color(0xFF1C1F26);
  static const Color destructive = Color(0xFFEF4444);
  static const Color textMain = Colors.white;
  static const Color textMuted = Color(0xFFacaaad);

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: background,
    colorScheme: const ColorScheme.dark(
      primary: primary,
      secondary: primary,
      surface: cardBg,
      background: background,
      error: destructive,
    ),
    cardTheme: CardThemeData(
      color: cardBg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
      titleLarge: GoogleFonts.outfit(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: textMain,
      ),
      bodyLarge: GoogleFonts.inter(
        color: textMain,
      ),
      bodyMedium: GoogleFonts.inter(
        color: textMuted,
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: background,
      elevation: 0,
      centerTitle: false,
    ),
  );

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: Colors.white,
    colorScheme: ColorScheme.light(
      primary: primary,
      secondary: primary,
      surface: Colors.white,
      background: Colors.white,
      error: destructive,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
    ),
  );
}
