package io.hlab.opencsp.api.console;

import io.hlab.opencsp.api.console.dto.ConsoleSessionResponse;
import io.hlab.opencsp.api.console.dto.CreateSessionRequest;
import io.hlab.opencsp.application.console.ConsoleService;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/console")
@RequiredArgsConstructor
@Tag(name = "Console", description = "웹 터미널 콘솔 세션 관리")
public class ConsoleController {

    private final ConsoleService consoleService;

    @PostMapping("/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "콘솔 세션 생성", description = "Teleport SSH 터미널 세션을 초기화하고 WebSocket 연결용 sessionId를 반환합니다.")
    public ApiResponse<ConsoleSessionResponse> createSession(
            @RequestBody @Valid CreateSessionRequest request,
            Authentication auth) {
        String userId = extractUserId(auth);
        ConsoleService.ConsoleSessionDto dto = consoleService.createSession(userId, request.getCrName(), request.getLogin());
        ConsoleSessionResponse response = consoleService.findBySessionId(dto.sessionId())
                .map(ConsoleSessionResponse::from)
                .orElseThrow();
        return ApiResponse.success(response);
    }

    @GetMapping("/sessions")
    @Operation(summary = "내 콘솔 세션 목록")
    public ApiResponse<List<ConsoleSessionResponse>> listSessions(Authentication auth) {
        String userId = extractUserId(auth);
        List<ConsoleSessionResponse> list = consoleService.listByUser(userId)
                .stream()
                .map(ConsoleSessionResponse::from)
                .toList();
        return ApiResponse.success(list);
    }

    private String extractUserId(Authentication auth) {
        if (auth instanceof JwtAuthenticationToken jwtToken) {
            Jwt jwt = jwtToken.getToken();
            return jwt.getSubject();
        }
        return auth != null ? auth.getName() : "anonymous";
    }
}
