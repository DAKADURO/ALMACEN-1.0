/**
 * Utilidad para exportar datos JSON a CSV y descargar el archivo.
 */
export function exportToCSV(data: any[], filename: string) {
    if (data.length === 0) return;

    // Obtener las cabeceras a partir de las llaves del primer objeto
    const headers = Object.keys(data[0]);

    // Crear las filas del CSV
    const csvRows = [
        headers.join(','), // Cabecera
        ...data.map(row =>
            headers.map(fieldName => {
                const value = row[fieldName];
                // Escapar comas y comillas
                const escaped = ('' + value).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        )
    ];

    // Crear el Blob y el link de descarga
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
