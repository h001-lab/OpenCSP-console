package io.hlab.opencsp.api.provision.dto;

public record ProvisionResponse(
        String crName,
        String moduleType,
        String userId,
        String statusUrl
) {}
