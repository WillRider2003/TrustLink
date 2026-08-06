package com.trustlink.backend.entity;

/**
 * Roles del sistema. Un mismo usuario puede comprar y vender (no hay
 * separacion rigida de cuenta comprador/vendedor, como en un marketplace
 * real), pero el SUPERADMIN es una cuenta especial de administracion.
 */
public enum Rol {
    USUARIO,   // puede comprar y publicar productos para vender
    SUPERADMIN // panel de administracion: banear usuarios, resolver disputas, ver metricas
}
