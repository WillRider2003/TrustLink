package com.trustlink.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PerfilDTO {

    @NotBlank
    @Size(max = 80)
    private String nombre;

    @NotBlank
    @Size(max = 80)
    private String apellido;

    private String telefono;
}
