package com.trustlink.backend.controller;

import com.trustlink.backend.security.UsuarioPrincipal;
import com.trustlink.backend.service.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@Controller
@RequestMapping("/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;

    @GetMapping
    public String listado(Model model, @AuthenticationPrincipal UsuarioPrincipal principal) {
        model.addAttribute("notificaciones", notificacionService.recientes(principal.getUsuario()));
        notificacionService.marcarTodasLeidas(principal.getUsuario());
        return "notificaciones/listado";
    }

    /** Usado por el navbar (fetch) para mostrar el contador sin recargar la página. */
    @GetMapping("/contador")
    @ResponseBody
    public Map<String, Long> contador(@AuthenticationPrincipal UsuarioPrincipal principal) {
        return Map.of("noLeidas", notificacionService.contarNoLeidas(principal.getUsuario()));
    }

    @PostMapping("/marcar-leidas")
    public String marcarLeidas(@AuthenticationPrincipal UsuarioPrincipal principal) {
        notificacionService.marcarTodasLeidas(principal.getUsuario());
        return "redirect:/notificaciones";
    }
}
