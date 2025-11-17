import { TOSBuilder } from '@/components/TOSBuilder';
import { useNavigate } from 'react-router-dom';

export default function TOSPage() {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <TOSBuilder onBack={() => navigate('/teacher/dashboard')} />
    </div>
  );
}
