package io.hlab.OpenConsole.api.user;

import io.hlab.OpenConsole.api.user.dto.UserCreateRequest;
import io.hlab.OpenConsole.api.user.dto.UserResponse;
import io.hlab.OpenConsole.api.user.dto.UserUpdateRequest;
import io.hlab.OpenConsole.application.user.UserService;
import io.hlab.OpenConsole.common.dto.ApiResponse;
import io.hlab.OpenConsole.domain.user.IamProvider;
import io.hlab.OpenConsole.domain.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("/api/me")
    public ApiResponse<UserResponse> getMyInfo(@AuthenticationPrincipal OidcUser principal, HttpServletRequest httpRequest) {
        if (principal == null) {
            return ApiResponse.error("UNAUTHORIZED", "로그인되지 않았습니다.");
        }
        
        // ZITADEL에서 넘겨준 실제 값들을 확인합니다.
        Optional<User> user = userService.findUserBySubject(IamProvider.ZITADEL, principal.getSubject());
        if (user.isEmpty()) {
            return ApiResponse.error("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
        }
        String baseUrl = getBaseUrl(httpRequest);
        String resourcePath = getResourcePath(httpRequest);
        return ApiResponse.success("사용자 정보를 조회했습니다.", UserResponse.from(user.get(), baseUrl, resourcePath));   
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> createUser(
            @RequestBody @Valid UserCreateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = userService.createUser(request.getEmail(), request.getName(), request.getProvider(), request.getSubject());
        User user = userService.getUser(userId);
        String baseUrl = getBaseUrl(httpRequest);
        String resourcePath = getResourcePath(httpRequest);
        return ApiResponse.success("사용자가 생성되었습니다.", UserResponse.from(user, baseUrl, resourcePath));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> getUser(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        User user = userService.getUser(id);
        String baseUrl = getBaseUrl(httpRequest);
        String resourcePath = getResourcePath(httpRequest);
        return ApiResponse.success(UserResponse.from(user, baseUrl, resourcePath));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> updateUser(
            @PathVariable Long id,
            @RequestBody @Valid UserUpdateRequest request,
            HttpServletRequest httpRequest) {
        userService.updateUser(id, request.getName());
        User user = userService.getUser(id);
        String baseUrl = getBaseUrl(httpRequest);
        String resourcePath = getResourcePath(httpRequest);
        return ApiResponse.success("사용자 정보가 수정되었습니다.", UserResponse.from(user, baseUrl, resourcePath));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }

    /**
     * HATEOAS: 요청의 기본 URL을 추출하여 링크 생성에 사용
     */
    private String getBaseUrl(HttpServletRequest request) {
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        String contextPath = request.getContextPath();
        
        StringBuilder url = new StringBuilder();
        url.append(scheme).append("://").append(serverName);
        
        if ((scheme.equals("http") && serverPort != 80) || 
            (scheme.equals("https") && serverPort != 443)) {
            url.append(":").append(serverPort);
        }
        
        url.append(contextPath);
        return url.toString();
    }

    /**
     * HATEOAS: 요청의 리소스 경로를 추출하여 링크 생성에 사용
     * @RequestMapping의 경로를 동적으로 가져옴
     */
    private String getResourcePath(HttpServletRequest request) {
        String requestURI = request.getRequestURI();
        String contextPath = request.getContextPath();
        
        // 컨텍스트 경로 제거
        String path = requestURI;
        if (contextPath != null && !contextPath.isEmpty()) {
            path = requestURI.substring(contextPath.length());
        }
        
        // ID가 포함된 경우 제거 (예: /users/1 -> /users)
        int lastSlashIndex = path.lastIndexOf('/');
        if (lastSlashIndex > 0) {
            String potentialId = path.substring(lastSlashIndex + 1);
            try {
                Long.parseLong(potentialId);
                // 숫자로 파싱 가능하면 ID이므로 제거
                path = path.substring(0, lastSlashIndex);
            } catch (NumberFormatException e) {
                // 숫자가 아니면 그대로 유지
            }
        }
        
        return path;
    }
}
