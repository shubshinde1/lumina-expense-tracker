
class Category {
  final String id;
  final String name;
  final String icon;
  final String color;
  final String type;
  final List<Subcategory>? subcategories;

  Category({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.type,
    this.subcategories,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['_id'],
      name: json['name'],
      icon: json['icon'],
      color: json['color'],
      type: json['type'],
      subcategories: json['subcategories'] != null
          ? (json['subcategories'] as List)
              .map((s) => Subcategory.fromJson(s))
              .toList()
          : null,
    );
  }
}

class Subcategory {
  final String id;
  final String name;

  Subcategory({required this.id, required this.name});

  factory Subcategory.fromJson(Map<String, dynamic> json) {
    return Subcategory(
      id: json['_id'],
      name: json['name'],
    );
  }
}

class Transaction {
  final String id;
  final String type;
  final double amount;
  final String? description;
  final DateTime date;
  final Category? category;
  final String? subcategory;
  final TransactionLocation? location;
  final String paymentMode;

  Transaction({
    required this.id,
    required this.type,
    required this.amount,
    this.description,
    required this.date,
    this.category,
    this.subcategory,
    this.location,
    required this.paymentMode,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['_id'],
      type: json['type'],
      amount: (json['amount'] as num).toDouble(),
      description: json['description'],
      date: DateTime.parse(json['date']).toLocal(),
      category: json['category'] != null ? Category.fromJson(json['category']) : null,
      subcategory: json['subcategory'],
      location: json['location'] != null ? TransactionLocation.fromJson(json['location']) : null,
      paymentMode: json['paymentMode'] ?? 'Cash',
    );
  }
}

class TransactionLocation {
  final double lat;
  final double lng;
  final String address;

  TransactionLocation({required this.lat, required this.lng, required this.address});

  factory TransactionLocation.fromJson(Map<String, dynamic> json) {
    return TransactionLocation(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      address: json['address'],
    );
  }
}
