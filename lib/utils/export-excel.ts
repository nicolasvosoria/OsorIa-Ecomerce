import * as XLSX from 'xlsx'
import type { DetailedStats } from '@/lib/supabase/stats-api'
import { formatPrice } from '@/lib/shopify/utils'

/**
 * Exporta las estadísticas a un archivo Excel
 */
export function exportStatsToExcel(stats: DetailedStats, filename: string = 'estadisticas') {
  // Crear un nuevo workbook
  const workbook = XLSX.utils.book_new()

  // ===== HOJA 1: Resumen General =====
  const summaryData = [
    ['REPORTE DE ESTADÍSTICAS'],
    ['Fecha de generación:', new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })],
    [''],
    ['ESTADÍSTICAS GENERALES'],
    ['Total de Pedidos', stats.totalOrders],
    ['Valor Promedio del Pedido', formatPrice(stats.averageOrderValue.toString(), 'COP')],
    ['Tasa de Conversión', `${stats.conversionRate.toFixed(2)}%`],
    [''],
  ]

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  
  // Ajustar ancho de columnas
  summarySheet['!cols'] = [
    { wch: 30 },
    { wch: 25 }
  ]

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

  // ===== HOJA 2: Ventas por Día =====
  const salesData = [
    ['Fecha', 'Ventas (COP)', 'Número de Pedidos']
  ]

  stats.salesByDay.forEach(day => {
    const date = new Date(day.date + 'T00:00:00')
    salesData.push([
      date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      day.sales,
      day.orders
    ])
  })

  const salesSheet = XLSX.utils.aoa_to_sheet(salesData)
  salesSheet['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 20 }
  ]

  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Ventas por Día')

  // ===== HOJA 3: Pedidos por Estado =====
  const ordersData = [
    ['Estado', 'Cantidad']
  ]

  stats.ordersByStatus.forEach(status => {
    ordersData.push([
      status.status.charAt(0).toUpperCase() + status.status.slice(1),
      status.count
    ])
  })

  const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData)
  ordersSheet['!cols'] = [
    { wch: 20 },
    { wch: 15 }
  ]

  XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Pedidos por Estado')

  // ===== HOJA 4: Productos Más Vendidos =====
  const productsData = [
    ['Producto', 'Cantidad Vendida', 'Ingresos (COP)']
  ]

  stats.topProducts.forEach(product => {
    productsData.push([
      product.name,
      product.quantity,
      product.revenue
    ])
  })

  const productsSheet = XLSX.utils.aoa_to_sheet(productsData)
  productsSheet['!cols'] = [
    { wch: 40 },
    { wch: 20 },
    { wch: 20 }
  ]

  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Productos Más Vendidos')

  // Generar el archivo Excel
  const excelBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array'
  })

  // Crear blob y descargar
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

