package io.hlab.opencsp.infrastructure.persistence.provision;

import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.domain.provision.ProvisionRepository;
import io.hlab.opencsp.domain.provision.ProvisionStatus;
import io.hlab.opencsp.domain.provision.SemaphoreStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ProvisionJpaRepository implements ProvisionRepository {

    private final SpringDataProvisionRepository jpa;

    @Override
    public Provision save(Provision provision) {
        return jpa.save(provision);
    }

    @Override
    public Optional<Provision> findByCrName(String crName) {
        return jpa.findByCrName(crName);
    }

    @Override
    public List<Provision> findAll() {
        return jpa.findAll();
    }

    @Override
    public List<Provision> findByUserId(String userId) {
        return jpa.findByUserId(userId);
    }

    @Override
    public List<Provision> findByStatus(ProvisionStatus status) {
        return jpa.findByStatus(status);
    }

    @Override
    public List<Provision> findBySemaphoreStatus(SemaphoreStatus semaphoreStatus) {
        return jpa.findBySemaphoreStatus(semaphoreStatus);
    }

    @Override
    public void deleteByCrName(String crName) {
        jpa.deleteByCrName(crName);
    }

    @Override
    public Optional<Long> findMaxVmId() {
        return jpa.findMaxVmId();
    }
}
