# OpenCSP: The Open-Source Cloud Builder

OpenCSP는 유휴 인프라 자원만 있다면 누구나 즉시 '클라우드 서비스 제공자(CSP)'가 될 수 있도록 돕는 올인원 클라우드 구축 솔루션입니다.

### 핵심 가치
복잡한 IDC 구축 없이 Proxmox와 최신 Cloud-Native 기술을 결합하여, Self-hosted(사내 구축형) 및 SaaS(서비스형) 형태의 퍼블릭/프라이빗 클라우드를 손쉽게 론칭할 수 있습니다.

### 기술적 특징: GitOps 기반의 자동화된 클라우드 
사용자의 모든 인프라 요청을 코드로 변환(IaC)하고, 검증된 오픈소스 도구들을 오케스트레이션하여 안정적인 서비스를 제공합니다.

**Control Plane (Core) 구성 요소:**
- Infrastructure: Proxmox VE (추후 OpenStack, K8s 지원) 기반의 가상화 환경 제공
- GitOps Engine: 사용자 요청 → Terraform Code 변환 → Flux CD를 통한 인프라 배포 자동화
- Configuration Management: Semaphore를 활용한 VM 보안 설정 및 모니터링 에이전트 자동 주입
- Security & Identity: Zitadel(IAM)을 통한 통합 인증과 Teleport(PAM)를 활용한 Bastion 없는 안전한 서버 접근
- Object Storage: AWS S3 호환 MinIO 스토리지 제공
- Monitoring: LGTM, OpenTelemetry
- Billing: Lago (Kill Bill) 연동
- Managed Services: 구축된 인프라 위에 DB, K8s Cluster, RabbitMQ 등을 원클릭으로 배포하는 PaaS 기능 내장

## 구조도 (Architecture Diagram)

```mermaid
flowchart TD
    %% 사용자 영역
    User["User / Admin"]
    
    %% OpenCSP Control Plane (관리 영역)
    subgraph Control_Plane ["OpenCSP Control Plane"]
        direction TB
        Portal["Service Portal (FE/BE)"]
        GitRepo["User IaC Git Repo"]
        
        subgraph Orchestration
            Flux["Flux CD"]
            TF_Con["TF-Controller"]
        end
        
        subgraph Operations ["Operations & Business"]
            Zitadel["Zitadel (IAM)"]
            Teleport["Teleport (PAM)"]
            Lago["Lago (Billing)"]
            LGTM["LGTM (Monitoring)"]
        end
        
        Semaphore["Semaphore (Provisioning)"]
    end

    %% Infrastructure Layer (자원 영역)
    subgraph Data_Plane ["Infrastructure Layer"]
        direction TB
        Proxmox["Proxmox VE Cluster"]
        MinIO["MinIO (Object Storage)"]
        
        subgraph User_Resources ["User Created Resources"]
            VM1["User VM (Web)"]
            VM2["User VM (DB)"]
            K8s["User K8s Cluster"]
        end
    end

    %% 연결 흐름
    User -->|Login| Zitadel
    User -->|Create Resource| Portal
    User -->|SSH Access| Teleport
    
    Portal -->|Generate .tf| GitRepo
    GitRepo -->|Sync| Flux
    Flux -->|Reconcile| TF_Con
    
    TF_Con -->|API Call| Proxmox
    TF_Con -->|Create Bucket| MinIO
    
    %% 프로비저닝 흐름
    TF_Con -.->|Trigger| Semaphore
    Semaphore -->|Ansible/Script| VM1
    Semaphore -->|Ansible/Script| VM2
    
    %% 실제 자원 배치
    Proxmox --- VM1
    Proxmox --- VM2
    Proxmox --- K8s
    
    %% 모니터링 및 빌링 데이터 흐름
    Proxmox -.->|Metrics| LGTM
    VM1 -.->|Logs/Metrics| LGTM
    LGTM -.->|Usage Data| Lago
    
    Teleport -.->|Connect| VM1
    Teleport -.->|Connect| VM2

    %% 스타일링
    style Portal fill:#f9f,stroke:#333,stroke-width:2px
    style Proxmox fill:#ccf,stroke:#333,stroke-width:2px
    style Flux fill:#cfc,stroke:#333,stroke-width:2px
    style Lago fill:#ff9,stroke:#333,stroke-width:2px
    style LGTM fill:#ff9,stroke:#333,stroke-width:2px
```