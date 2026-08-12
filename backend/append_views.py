
with open('e:/CIT/smart-bin/backend/bins/views.py', 'a', encoding='utf-8') as f:
    f.write('''

class DemoStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_enabled = os.getenv('ENABLE_SIMULATOR', 'False').lower() in ('true', '1', 't')
        has_dataset = Municipality.objects.filter(is_demo=True).exists()
        
        real_bins = Bin.objects.filter(data_source=Bin.DATA_SOURCE_REAL).count()
        sim_bins = Bin.objects.filter(data_source=Bin.DATA_SOURCE_SIMULATED).count()
        
        return Response({
            "is_enabled": is_enabled,
            "has_dataset": has_dataset,
            "counts": {
                "real_bins": real_bins,
                "simulated_bins": sim_bins
            }
        })

class DemoGenerateView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def post(self, request):
        if not os.getenv('ENABLE_SIMULATOR', 'False').lower() in ('true', '1', 't'):
            return Response(
                {"error": "Demo simulation is disabled in this environment."}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        profile = request.user.profile if hasattr(request.user, 'profile') else None
        
        try:
            result = DemoDataService.generate_demo_dataset(profile)
            return Response(result)
        except Exception as e:
            return Response(
                {"error": "Demo dataset generation failed.", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DemoResetView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def delete(self, request):
        if not os.getenv('ENABLE_SIMULATOR', 'False').lower() in ('true', '1', 't'):
            return Response(
                {"error": "Demo simulation is disabled in this environment."}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        profile = request.user.profile if hasattr(request.user, 'profile') else None
        
        try:
            result = DemoDataService.reset_demo_dataset(profile)
            return Response(result)
        except Exception as e:
            return Response(
                {"error": "Demo dataset reset failed.", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
''')
