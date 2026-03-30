package io.hlab.opencsp.infrastructure.persistence.provision;

import io.hlab.opencsp.domain.provision.ProvisionOutput;
import io.hlab.opencsp.domain.provision.ProvisionOutputRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ProvisionOutputJpaRepository implements ProvisionOutputRepository {

    private final SpringDataProvisionOutputRepository jpa;

    @Override public ProvisionOutput save(ProvisionOutput output) { return jpa.save(output); }
    @Override public void saveAll(List<ProvisionOutput> outputs) { jpa.saveAll(outputs); }
    @Override public List<ProvisionOutput> findByCrName(String crName) { return jpa.findByCrName(crName); }
    @Override public Optional<ProvisionOutput> findByCrNameAndOutputKey(String crName, String outputKey) {
        return jpa.findByCrNameAndOutputKey(crName, outputKey);
    }
    @Override @Transactional
    public void deleteByCrName(String crName) { jpa.deleteByCrName(crName); }
}
