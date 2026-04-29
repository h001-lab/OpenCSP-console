{{/*
차트 이름 (63자 제한)
*/}}
{{- define "opencsp-console.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
fullname: Release.name + 차트 이름 조합 (중복 방지)
*/}}
{{- define "opencsp-console.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
공통 레이블
*/}}
{{- define "opencsp-console.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{ include "opencsp-console.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
셀렉터 레이블 (Deployment/Service matchLabels)
*/}}
{{- define "opencsp-console.selectorLabels" -}}
app.kubernetes.io/name: {{ include "opencsp-console.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
BE 서비스 URL — FE가 BACKEND_URL 미설정 시 자동으로 참조
*/}}
{{- define "opencsp-console.beServiceURL" -}}
{{- printf "http://%s-be:%d" (include "opencsp-console.fullname" .) (int .Values.be.service.port) }}
{{- end }}

{{/*
PAM이 활성화되어 있는지 — provider가 비어있지 않으면 true.
사용처: be-deployment에서 sidecar/volume 주입 여부 판단.
*/}}
{{- define "opencsp-console.pamEnabled" -}}
{{- if .Values.pam.provider -}}true{{- end -}}
{{- end -}}

{{/*
PAM이 사용할 ServiceAccount 이름. provider별로 다름.
*/}}
{{- define "opencsp-console.pamServiceAccountName" -}}
{{- if eq .Values.pam.provider "teleport" -}}
{{- .Values.pam.teleport.serviceAccountName -}}
{{- end -}}
{{- end -}}

{{/*
PAM sidecar (initContainer with restartPolicy: Always for K8s 1.29+ native sidecar).
provider에 따라 적절한 sidecar 정의를 렌더.
*/}}
{{- define "opencsp-console.pamSidecar" -}}
{{- if eq .Values.pam.provider "teleport" -}}
- name: tbot
  image: "{{ .Values.pam.teleport.image.repository }}:{{ .Values.pam.teleport.image.tag | default .Chart.AppVersion }}"
  imagePullPolicy: {{ .Values.pam.teleport.image.pullPolicy }}
  restartPolicy: Always
  args:
    - start
    - --config=/etc/tbot/tbot.yaml
  volumeMounts:
    - name: pam-identity
      mountPath: {{ .Values.pam.identityMountPath }}
    - name: pam-config
      mountPath: /etc/tbot
      readOnly: true
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop: ["ALL"]
  {{- with .Values.pam.teleport.resources }}
  resources:
    {{- toYaml . | nindent 4 }}
  {{- end }}
{{- end -}}
{{- end -}}

{{/*
PAM이 추가하는 volumes. provider에 따라 다른 볼륨 세트를 렌더.
공통 규칙: pam-identity는 sidecar가 자격증명을 쓰고 BE가 읽는 emptyDir.
*/}}
{{- define "opencsp-console.pamVolumes" -}}
{{- if eq .Values.pam.provider "teleport" -}}
- name: pam-identity
  emptyDir: {}
- name: pam-config
  configMap:
    name: {{ include "opencsp-console.fullname" . }}-pam-config
{{- end -}}
{{- end -}}