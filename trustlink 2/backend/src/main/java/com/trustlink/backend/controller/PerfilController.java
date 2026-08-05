package com.trustlink.backend.controller;

import com.trustlink.backend.dto.PerfilDTO;
import com.trustlink.backend.entity.ReputacionVendedor;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.ReputacionVendedorRepository;
import com.trustlink.backend.security.UsuarioPrincipal;
import com.trustlink.backend.service.PerfilService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Controller
@RequestMapping("/perfil")
@RequiredArgsConstructor
public class PerfilController {

    private final PerfilService perfilService;
    private final ReputacionVendedorRepository reputacionRepository;

    @GetMapping
    public String verPerfil(Model model, @AuthenticationPrincipal UsuarioPrincipal principal) {
        var usuario = principal.getUsuario();
        model.addAttribute("usuario", usuario);

        PerfilDTO dto = new PerfilDTO();
        dto.setNombre(usuario.getNombre());
        dto.setApellido(usuario.getApellido());
        dto.setTelefono(usuario.getTelefono());
        model.addAttribute("perfilDTO", dto);

        ReputacionVendedor rep = reputacionRepository.findByUsuario(usuario)
                .orElse(ReputacionVendedor.builder().ventasExitosas(0).scoreActual(0).compradoresDistintos(0).build());
        model.addAttribute("reputacion", rep);

        return "perfil/ver";
    }

    @PostMapping("/actualizar")
    public String actualizarDatos(@Valid @ModelAttribute PerfilDTO perfilDTO,
                                   BindingResult result,
                                   @AuthenticationPrincipal UsuarioPrincipal principal,
                                   Model model) {
        if (result.hasErrors()) {
            model.addAttribute("usuario", principal.getUsuario());
            return "perfil/ver";
        }
        Usuario actualizado = perfilService.actualizarDatos(principal.getId(), perfilDTO);
        refrescarSesion(actualizado);
        return "redirect:/perfil?actualizado=true";
    }

    @PostMapping("/foto")
    public String actualizarFoto(@RequestParam MultipartFile foto,
                                  @AuthenticationPrincipal UsuarioPrincipal principal,
                                  Model model) {
        try {
            Usuario actualizado = perfilService.actualizarFoto(principal.getId(), foto);
            refrescarSesion(actualizado);
            return "redirect:/perfil?fotoActualizada=true";
        } catch (Exception e) {
            return "redirect:/perfil?errorFoto=true";
        }
    }

    /**
     * Spring Security guarda el UsuarioPrincipal (con los datos del
     * Usuario) DENTRO de la sesión HTTP tras el login, y no lo vuelve a
     * cargar desde la base de datos en cada request. Sin este refresco,
     * editar el nombre/foto no se reflejaría en la navbar ni en el
     * propio formulario de perfil hasta cerrar sesión y volver a entrar
     * — un bug real de "los cambios no se ven" que confundiría en la demo.
     */
    private void refrescarSesion(Usuario usuarioActualizado) {
        UsuarioPrincipal nuevoPrincipal = new UsuarioPrincipal(usuarioActualizado);
        Authentication nuevaAuth = new UsernamePasswordAuthenticationToken(
                nuevoPrincipal, nuevoPrincipal.getPassword(), nuevoPrincipal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(nuevaAuth);
    }
}
