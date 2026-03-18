import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [dbStatus, setDbStatus] = useState('Checking...');

  useEffect(() => {
    axios.get('/api/health')
      .then(res => setDbStatus(res.data.database))
      .catch(() => setDbStatus('Connection Failed'));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold mb-4">Project FORGE</h1>
      <p className="text-xl">Database Status: 
        <span className={dbStatus === 'Oracle 19c RDS' ? 'text-green-500' : 'text-red-500'}>
          {` ${dbStatus}`}
        </span>
      </p>
    </div>
  );
}