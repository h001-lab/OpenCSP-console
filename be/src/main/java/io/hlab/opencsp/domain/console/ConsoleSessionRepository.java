package io.hlab.opencsp.domain.console;

import java.util.List;
import java.util.Optional;

public interface ConsoleSessionRepository {
    ConsoleSession save(ConsoleSession session);
    Optional<ConsoleSession> findBySessionId(String sessionId);
    List<ConsoleSession> findByUserId(String userId);
    List<ConsoleSession> findAll();
}
