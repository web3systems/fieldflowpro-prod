import { useQuery } from '@tanstack/react-query';
import { builderCall } from '@/components/website/builderClient';
export default function useWebsiteTemplates() {
  return useQuery({ queryKey: ['website-service-templates'], queryFn: async () => (await builderCall('templates')).templates, staleTime: 300000 });
}