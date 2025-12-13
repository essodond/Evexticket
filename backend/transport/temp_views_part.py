
class TripSyncView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        last_sync_str = request.query_params.get('last_sync_timestamp')
        
        if last_sync_str:
            try:
                last_sync_timestamp = datetime.fromisoformat(last_sync_str).replace(tzinfo=timezone.utc)
            except ValueError:
                return Response({"error": "Invalid last_sync_timestamp format. Use ISO 8601."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Fetch trips that were created or updated since last_sync_timestamp
            updated_trips = ScheduledTrip.objects.filter(
                Q(created_at__gte=last_sync_timestamp) | Q(updated_at__gte=last_sync_timestamp)
            ).distinct()
            
            updated_trip_serializer = TripSearchSerializer(updated_trips, many=True)
            
            return Response({
                "updated_trips": updated_trip_serializer.data,
                "current_timestamp": datetime.now(timezone.utc).isoformat()
            }, status=status.HTTP_200_OK)
        else:
            # If no timestamp is provided, return all trips (initial sync)
            all_trips = ScheduledTrip.objects.all()
            all_trip_serializer = TripSearchSerializer(all_trips, many=True)
            return Response({
                "all_trips": all_trip_serializer.data,
                "current_timestamp": datetime.now(timezone.utc).isoformat()
            }, status=status.HTTP_200_OK)


@api_view(['GET'])
def scheduled_trip_stops(request, pk):
    """
    Retourne les arrêts pour un ScheduledTrip donné.
    Les arrêts sont ceux du Trip associé.
    """
    try:
        scheduled_trip = ScheduledTrip.objects.get(pk=pk)
        trip = scheduled_trip.trip
        stops = TripStop.objects.filter(trip=trip).order_by('sequence')
        serializer = TripStopSerializer(stops, many=True)
        return Response(serializer.data)
    except ScheduledTrip.DoesNotExist:
        return Response({'detail': 'Trajet planifié non trouvé.'}, status=status.HTTP_404_NOT_FOUND)
