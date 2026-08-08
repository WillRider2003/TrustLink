package com.trustlink.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class ArchivoService {

    @Value("${trustlink.uploads.dir}")
    private String uploadsDir;

    private static final Set<String> EXTENSIONES_PERMITIDAS = Set.of("jpg", "jpeg", "png", "webp");
    private static final long TAMANO_MAX_BYTES = 5L * 1024 * 1024; // 5 MB

    /**
     * Guarda una imagen subida (foto de perfil o de producto) dentro de
     * una subcarpeta, validando extension y tamaño. Devuelve la ruta
     * relativa para guardar en la base de datos (ej. "perfiles/uuid.jpg").
     */
    public String guardarImagen(MultipartFile archivo, String subcarpeta) throws IOException {
        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("No se recibió ningún archivo");
        }
        if (archivo.getSize() > TAMANO_MAX_BYTES) {
            throw new IllegalArgumentException("La imagen supera el tamaño máximo de 5 MB");
        }

        String nombreOriginal = archivo.getOriginalFilename();
        String extension = "";
        if (nombreOriginal != null && nombreOriginal.contains(".")) {
            extension = nombreOriginal.substring(nombreOriginal.lastIndexOf('.') + 1).toLowerCase();
        }
        if (!EXTENSIONES_PERMITIDAS.contains(extension)) {
            throw new IllegalArgumentException("Formato no permitido. Usa JPG, PNG o WEBP");
        }

        String nombreArchivo = UUID.randomUUID() + "." + extension;
        Path carpetaDestino = Path.of(uploadsDir, subcarpeta);
        Files.createDirectories(carpetaDestino);

        Path destino = carpetaDestino.resolve(nombreArchivo);
        Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

        return subcarpeta + "/" + nombreArchivo;
    }
}
