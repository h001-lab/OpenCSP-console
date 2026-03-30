package io.hlab.opencsp.infrastructure.persistence.console;

import io.hlab.opencsp.domain.console.ConsoleSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpringDataConsoleSessionRepository extends JpaRepository<ConsoleSession, Long> {
    Optional<ConsoleSession> findBySessionId(String sessionId);
    List<ConsoleSession> findByUserId(String userId);
}
