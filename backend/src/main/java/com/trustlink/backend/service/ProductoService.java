package com.trustlink.backend.service;

import com.trustlink.backend.entity.Producto;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.ProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final ArchivoService archivoService;

    public List<Producto> listarActivos() {
        return productoRepository.findByActivoTrueOrderByCreadoEnDesc();
    }

    public List<Producto> misProductos(Usuario vendedor) {
        return productoRepository.findByVendedorOrderByCreadoEnDesc(vendedor);
    }

    @Transactional
    public Producto publicar(Usuario vendedor, String nombre, String descripcion, BigDecimal precio, MultipartFile foto) throws IOException {
        String fotoUrl = null;
        if (foto != null && !foto.isEmpty()) {
            fotoUrl = archivoService.guardarImagen(foto, "productos");
        }

        Producto producto = Producto.builder()
                .vendedor(vendedor)
                .nombre(nombre.trim())
                .descripcion(descripcion)
                .precioSoles(precio)
                .fotoUrl(fotoUrl)
                .build();

        return productoRepository.save(producto);
    }

    public Producto obtener(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));
    }
}
