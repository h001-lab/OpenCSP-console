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
