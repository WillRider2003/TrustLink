package com.trustlink.backend.service;

import com.trustlink.backend.dto.PerfilDTO;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class PerfilService {

    private final UsuarioRepository usuarioRepository;
    private final ArchivoService archivoService;

    @Transactional
    public Usuario actualizarDatos(Long usuarioId, PerfilDTO dto) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        usuario.setNombre(dto.getNombre().trim());
        usuario.setApellido(dto.getApellido().trim());
        usuario.setTelefono(dto.getTelefono());

        return usuarioRepository.save(usuario);
    }

    @Transactional
    public Usuario actualizarFoto(Long usuarioId, MultipartFile foto) throws IOException {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        String rutaRelativa = archivoService.guardarImagen(foto, "perfiles");
        usuario.setFotoUrl(rutaRelativa);

        return usuarioRepository.save(usuario);
    }

    @Transactional
    public Usuario actualizarPreferenciasNotificacion(Long usuarioId, boolean enApp, boolean porCorreo) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        usuario.setNotificacionesEnApp(enApp);
        usuario.setNotificacionesPorCorreo(porCorreo);

        return usuarioRepository.save(usuario);
    }
}
