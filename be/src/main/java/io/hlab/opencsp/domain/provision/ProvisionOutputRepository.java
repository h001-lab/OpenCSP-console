package io.hlab.opencsp.domain.provision;

import java.util.List;
import java.util.Optional;

public interface ProvisionOutputRepository {
    ProvisionOutput save(ProvisionOutput output);
    void saveAll(List<ProvisionOutput> outputs);
    List<ProvisionOutput> findByCrName(String crName);
    Optional<ProvisionOutput> findByCrNameAndOutputKey(String crName, String outputKey);
    void deleteByCrName(String crName);
}
