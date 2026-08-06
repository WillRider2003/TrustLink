package com.trustlink.backend.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.trustlink.backend.entity.LogAuditoria;
import com.trustlink.backend.entity.OrdenEscrow;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Genera archivos CSV, Excel (.xlsx) y PDF para las distintas
 * exportaciones del sistema (logs de auditoría, dashboard de ventas).
 */
@Service
public class ExportacionService {

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private static final DateTimeFormatter FORMATO_FECHA_CORTA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] logsACsv(List<LogAuditoria> logs) {
        StringBuilder sb = new StringBuilder();
        sb.append("\uFEFF"); // BOM para UTF-8 en Excel
        sb.append("Fecha,Actor,Accion,Entidad,Entidad ID,Detalle\n");
        for (LogAuditoria log : logs) {
            sb.append(csv(log.getCreadoEn().format(FORMATO_FECHA))).append(",");
            sb.append(csv(log.getActorEmail())).append(",");
            sb.append(csv(log.getAccion().name())).append(",");
            sb.append(csv(log.getEntidadTipo())).append(",");
            sb.append(csv(log.getEntidadId() != null ? String.valueOf(log.getEntidadId()) : "")).append(",");
            sb.append(csv(log.getDetalle())).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] logsAExcel(List<LogAuditoria> logs) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Auditoria");

            CellStyle estiloEncabezado = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font fuenteEncabezado = workbook.createFont();
            fuenteEncabezado.setBold(true);
            estiloEncabezado.setFont(fuenteEncabezado);

            Row encabezado = sheet.createRow(0);
            String[] columnas = {"Fecha", "Actor", "Acción", "Entidad", "Entidad ID", "Detalle"};
            for (int i = 0; i < columnas.length; i++) {
                Cell celda = encabezado.createCell(i);
                celda.setCellValue(columnas[i]);
                celda.setCellStyle(estiloEncabezado);
            }

            int filaIdx = 1;
            for (LogAuditoria log : logs) {
                Row fila = sheet.createRow(filaIdx++);
                fila.createCell(0).setCellValue(log.getCreadoEn().format(FORMATO_FECHA));
                fila.createCell(1).setCellValue(log.getActorEmail());
                fila.createCell(2).setCellValue(log.getAccion().name());
                fila.createCell(3).setCellValue(log.getEntidadTipo() != null ? log.getEntidadTipo() : "");
                fila.createCell(4).setCellValue(log.getEntidadId() != null ? log.getEntidadId() : 0);
                fila.createCell(5).setCellValue(log.getDetalle());
            }

            for (int i = 0; i < columnas.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar el archivo Excel", e);
        }
    }

    /** Escapa un valor para CSV: envuelve en comillas si contiene coma, comilla o salto de línea. */
    private String csv(String valor) {
        if (valor == null) return "";
        String limpio = valor.replace("\"", "\"\"");
        if (limpio.contains(",") || limpio.contains("\"") || limpio.contains("\n")) {
            return "\"" + limpio + "\"";
        }
        return limpio;
    }

    // ---------- Exportación de ventas del vendedor ----------

    public byte[] ventasACsv(List<OrdenEscrow> ordenes) {
        StringBuilder sb = new StringBuilder();
        sb.append("\uFEFF");
        sb.append("Fecha,Producto,Comprador,Monto (S/),Estado\n");
        for (OrdenEscrow o : ordenes) {
            sb.append(csv(o.getCreadoEn().format(FORMATO_FECHA))).append(",");
            sb.append(csv(o.getProducto().getNombre())).append(",");
            sb.append(csv(o.getComprador().getNombreCompleto())).append(",");
            sb.append(csv(o.getMontoSoles().toString())).append(",");
            sb.append(csv(o.getEstado().name())).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] ventasAExcel(List<OrdenEscrow> ordenes) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Ventas");

            CellStyle estiloEncabezado = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font fuenteEncabezado = workbook.createFont();
            fuenteEncabezado.setBold(true);
            estiloEncabezado.setFont(fuenteEncabezado);

            Row encabezado = sheet.createRow(0);
            String[] columnas = {"Fecha", "Producto", "Comprador", "Monto (S/)", "Estado"};
            for (int i = 0; i < columnas.length; i++) {
                Cell celda = encabezado.createCell(i);
                celda.setCellValue(columnas[i]);
                celda.setCellStyle(estiloEncabezado);
            }

            int filaIdx = 1;
            BigDecimal total = BigDecimal.ZERO;
            for (OrdenEscrow o : ordenes) {
                Row fila = sheet.createRow(filaIdx++);
                fila.createCell(0).setCellValue(o.getCreadoEn().format(FORMATO_FECHA));
                fila.createCell(1).setCellValue(o.getProducto().getNombre());
                fila.createCell(2).setCellValue(o.getComprador().getNombreCompleto());
                fila.createCell(3).setCellValue(o.getMontoSoles().doubleValue());
                fila.createCell(4).setCellValue(o.getEstado().name());
                total = total.add(o.getMontoSoles());
            }

            Row filaTotal = sheet.createRow(filaIdx + 1);
            Cell etiquetaTotal = filaTotal.createCell(2);
            etiquetaTotal.setCellValue("Total");
            etiquetaTotal.setCellStyle(estiloEncabezado);
            Cell valorTotal = filaTotal.createCell(3);
            valorTotal.setCellValue(total.doubleValue());
            valorTotal.setCellStyle(estiloEncabezado);

            for (int i = 0; i < columnas.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar el archivo Excel", e);
        }
    }

    public byte[] ventasAPdf(List<OrdenEscrow> ordenes, String nombreVendedor, String rangoTexto) {
        try {
            Document documento = new Document(PageSize.A4, 36, 36, 54, 36);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter.getInstance(documento, out);
            documento.open();

            com.lowagie.text.Font fuenteTitulo = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            com.lowagie.text.Font fuenteSubtitulo = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY);
            com.lowagie.text.Font fuenteEncabezadoTabla = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
            com.lowagie.text.Font fuenteCelda = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);

            Paragraph titulo = new Paragraph("Reporte de ventas — TrustLink", fuenteTitulo);
            documento.add(titulo);
            documento.add(new Paragraph(nombreVendedor + " · " + rangoTexto, fuenteSubtitulo));
            documento.add(Chunk.NEWLINE);

            PdfPTable tabla = new PdfPTable(5);
            tabla.setWidthPercentage(100);
            tabla.setWidths(new float[]{2.2f, 3f, 2.5f, 1.5f, 1.8f});

            String[] columnas = {"Fecha", "Producto", "Comprador", "Monto (S/)", "Estado"};
            for (String col : columnas) {
                PdfPCell celda = new PdfPCell(new Phrase(col, fuenteEncabezadoTabla));
                celda.setBackgroundColor(new Color(232, 67, 47));
                celda.setPadding(6);
                tabla.addCell(celda);
            }

            BigDecimal total = BigDecimal.ZERO;
            for (OrdenEscrow o : ordenes) {
                tabla.addCell(new PdfPCell(new Phrase(o.getCreadoEn().format(FORMATO_FECHA_CORTA), fuenteCelda)));
                tabla.addCell(new PdfPCell(new Phrase(o.getProducto().getNombre(), fuenteCelda)));
                tabla.addCell(new PdfPCell(new Phrase(o.getComprador().getNombreCompleto(), fuenteCelda)));
                tabla.addCell(new PdfPCell(new Phrase("S/ " + o.getMontoSoles(), fuenteCelda)));
                tabla.addCell(new PdfPCell(new Phrase(o.getEstado().name(), fuenteCelda)));
                total = total.add(o.getMontoSoles());
            }
            documento.add(tabla);

            documento.add(Chunk.NEWLINE);
            com.lowagie.text.Font fuenteTotal = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Paragraph totalPar = new Paragraph("Total: S/ " + total, fuenteTotal);
            totalPar.setAlignment(Element.ALIGN_RIGHT);
            documento.add(totalPar);

            documento.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            throw new RuntimeException("No se pudo generar el PDF", e);
        }
    }
}