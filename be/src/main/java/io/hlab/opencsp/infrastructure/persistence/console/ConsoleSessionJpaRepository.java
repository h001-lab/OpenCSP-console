package io.hlab.opencsp.infrastructure.persistence.console;

import io.hlab.opencsp.domain.console.ConsoleSession;
import io.hlab.opencsp.domain.console.ConsoleSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ConsoleSessionJpaRepository implements ConsoleSessionRepository {

    private final SpringDataConsoleSessionRepository jpa;

    @Override public ConsoleSession save(ConsoleSession session) { return jpa.save(session); }
    @Override public Optional<ConsoleSession> findBySessionId(String sessionId) { return jpa.findBySessionId(sessionId); }
    @Override public List<ConsoleSession> findByUserId(String userId) { return jpa.findByUserId(userId); }
    @Override public List<ConsoleSession> findAll() { return jpa.findAll(); }
}
