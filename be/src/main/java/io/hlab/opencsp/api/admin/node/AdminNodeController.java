package io.hlab.opencsp.api.admin.node;

import io.hlab.opencsp.api.admin.node.dto.NodeRequest;
import io.hlab.opencsp.api.admin.node.dto.NodeResponse;
import io.hlab.opencsp.application.node.NodeService;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.hlab.opencsp.domain.node.NodeStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/nodes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Nodes", description = "노드 관리 API")
public class AdminNodeController {

    private final NodeService nodeService;

    @GetMapping
    @Operation(summary = "노드 목록 조회")
    public ApiResponse<List<NodeResponse>> list() {
        return ApiResponse.success(nodeService.findAll().stream().map(NodeResponse::from).toList());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "노드 등록")
    public ApiResponse<NodeResponse> create(@RequestBody @Valid NodeRequest request) {
        return ApiResponse.success(NodeResponse.from(
                nodeService.create(request.getHostname(), request.getIp(), request.getType(), request.getDescription())
        ));
    }

    @PatchMapping("/{uuid}/status")
    @Operation(summary = "노드 상태 변경")
    public ApiResponse<NodeResponse> updateStatus(
            @PathVariable String uuid,
            @RequestParam NodeStatus status) {
        return ApiResponse.success(NodeResponse.from(nodeService.updateStatus(uuid, status)));
    }

    @DeleteMapping("/{uuid}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "노드 삭제")
    public void delete(@PathVariable String uuid) {
        nodeService.delete(uuid);
    }
}
