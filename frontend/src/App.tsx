import React from 'react';
import ChatInterface from './components/ChatInterface';

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>LangChain Agent Chat</h1>
      <ChatInterface />
    </div>
  );
};

export default App;