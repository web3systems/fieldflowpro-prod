import { useParams } from 'react-router-dom';
import BuilderWorkspace from '@/components/website/BuilderWorkspace';
export default function WebsiteEditor() {
  const { siteId } = useParams();
  return <BuilderWorkspace key={siteId} siteId={siteId} />;
}