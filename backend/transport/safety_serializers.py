from rest_framework import serializers

from .models import SafetyIncident


def _display_name(user):
    if not user:
        return None
    full_name = user.get_full_name().strip()
    return full_name or user.username or user.email


class SafetyIncidentSerializer(serializers.ModelSerializer):
    company = serializers.SerializerMethodField()
    company_name = serializers.CharField(source='scheduled_trip.trip.company.name', read_only=True)
    route_label = serializers.SerializerMethodField()
    travel_date = serializers.DateField(source='scheduled_trip.date', read_only=True)
    reporter_name = serializers.SerializerMethodField()
    acknowledged_by_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()
    incident_type_label = serializers.CharField(source='get_incident_type_display', read_only=True)
    travel_state_label = serializers.CharField(source='get_travel_state_display', read_only=True)
    severity_label = serializers.CharField(source='get_severity_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SafetyIncident
        fields = [
            'id', 'company', 'company_name', 'scheduled_trip', 'route_label', 'travel_date',
            'incident_type', 'incident_type_label', 'travel_state', 'travel_state_label',
            'severity', 'severity_label', 'status', 'status_label', 'description',
            'public_message', 'latitude', 'longitude', 'accuracy_m', 'location_recorded_at',
            'location_source', 'injured_count', 'emergency_services_contacted', 'occurred_at',
            'created_at', 'updated_at', 'reporter_name', 'acknowledged_at',
            'acknowledged_by_name', 'resolved_at', 'resolved_by_name', 'resolution_note',
        ]
        read_only_fields = fields

    def get_company(self, obj):
        return obj.scheduled_trip.trip.company_id

    def get_route_label(self, obj):
        trip = obj.scheduled_trip.trip
        return f'{trip.departure_city.name} → {trip.arrival_city.name}'

    def get_reporter_name(self, obj):
        return _display_name(obj.reported_by)

    def get_acknowledged_by_name(self, obj):
        return _display_name(obj.acknowledged_by)

    def get_resolved_by_name(self, obj):
        return _display_name(obj.resolved_by)


class PublicSafetyIncidentSerializer(serializers.ModelSerializer):
    incident_type_label = serializers.CharField(source='get_incident_type_display', read_only=True)
    travel_state_label = serializers.CharField(source='get_travel_state_display', read_only=True)
    severity_label = serializers.CharField(source='get_severity_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SafetyIncident
        fields = [
            'id', 'incident_type', 'incident_type_label', 'travel_state', 'travel_state_label',
            'severity', 'severity_label', 'status', 'status_label', 'public_message', 'occurred_at',
        ]
        read_only_fields = fields
