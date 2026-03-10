import pandas as pd
import io

# Simulate the user's Excel columns
data = {
    'ITEM': ['A921', 'A912'],
    'PRICE LIST USD': ['$890.10', '$1,503.28'],
    'NAME': ['Reducing pipe-to-pipe connector', 'Reducing wye'],
    'DESCRIPTION': ['200 mm to 150 mm (8" to 6") Reducing Connector', '200 mm to 150 mm (8" to 6") Reducing Lateral Tee'],
    'CATEGORY': ['Connectors', 'Connectors'],
    'EXISTENCIA': ['0', '0']
}
df = pd.DataFrame(data)

# Normalize columns
df.columns = [c.lower().strip() for c in df.columns]
print("Normalized Columns:", df.columns.tolist())

HEADER_MAPPING = {
    'item': 'code', 'codigo': 'code', 'pn': 'code', 'part number': 'code', 'code': 'code',
    'name': 'name', 'nombre': 'name',
    'descripcion': 'description', 'description': 'description',
    'marca': 'brand', 'brand': 'brand',
    'total en existencia': 'initial_stock', 'existencia': 'initial_stock',
    'stock': 'initial_stock', 'cantidad': 'initial_stock',
    'comentarios': 'comments', 'comments': 'comments', 'notas': 'comments', 'notes': 'comments',
    'price list usd': 'cost_price', 'costo': 'cost_price', 'precio': 'cost_price', 'cost': 'cost_price',
    'category': 'family', 'categoria': 'family', 'familia': 'family',
    'unidad': 'unit_of_measure', 'unit': 'unit_of_measure',
    'min_stock': 'min_stock', 'stock_min': 'min_stock'
}

mapped_df = pd.DataFrame()
for col in df.columns:
    if col in HEADER_MAPPING:
        target = HEADER_MAPPING[col]
        if target not in mapped_df.columns:
            mapped_df[target] = df[col]

print("\nMapped DataFrame Columns:", mapped_df.columns.tolist())
print("\nMapped Data:")
print(mapped_df.head())
