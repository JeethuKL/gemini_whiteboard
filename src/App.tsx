import React, { useMemo, useState, useEffect } from 'react';
import Whiteboard from './components/Whiteboard';
import Login from './components/Login';

function App() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem('facilitron-authed') === 'true');
  }, []);

  const handleLoginSuccess = () => {
    setAuthed(true);
  };

  return (
    <div className="min-h-screen">
      {authed ? <Whiteboard /> : <Login onSuccess={handleLoginSuccess} />}
    </div>
  );
}

export default App;