{{/*
Expand the name of the chart.
*/}}
{{- define "zoom-enhance.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "zoom-enhance.fullname" -}}
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
Create chart name and version as used by the chart label.
*/}}
{{- define "zoom-enhance.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "zoom-enhance.labels" -}}
helm.sh/chart: {{ include "zoom-enhance.chart" . }}
{{ include "zoom-enhance.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "zoom-enhance.selectorLabels" -}}
app.kubernetes.io/name: {{ include "zoom-enhance.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Model endpoint URL
*/}}
{{- define "zoom-enhance.modelEndpoint" -}}
{{- $namespace := .Values.model.namespace | default .Release.Namespace -}}
{{- $serviceName := .Values.model.serviceName | default (printf "%s-predictor" .Values.model.name) -}}
http://{{ $serviceName }}.{{ $namespace }}.svc.cluster.local:{{ .Values.model.port }}/v2/models/{{ .Values.model.name }}/infer
{{- end }}
