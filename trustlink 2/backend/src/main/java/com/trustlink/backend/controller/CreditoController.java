package com.trustlink.backend.controller;

import com.trustlink.backend.security.UsuarioPrincipal;
import com.trustlink.backend.service.CreditoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;

@Controller
@RequestMapping("/credito")
@RequiredArgsConstructor
public class CreditoController {

    private final CreditoService creditoService;

    @GetMapping
    public String panel(Model model, @AuthenticationPrincipal UsuarioPrincipal principal) {
        model.addAttribute("techo", creditoService.techoActual(principal.getUsuario()));
        model.addAttribute("historial", creditoService.historial(principal.getUsuario()));
        return "credito/panel";
    }

    @PostMapping("/solicitar")
    public String solicitar(@RequestParam BigDecimal monto,
                             @AuthenticationPrincipal UsuarioPrincipal principal,
                             Model model) {
        var solicitud = creditoService.solicitar(principal.getUsuario(), monto);
        model.addAttribute("techo", creditoService.techoActual(principal.getUsuario()));
        model.addAttribute("historial", creditoService.historial(principal.getUsuario()));
        model.addAttribute("ultimaSolicitud", solicitud);
        return "credito/panel";
    }
}
