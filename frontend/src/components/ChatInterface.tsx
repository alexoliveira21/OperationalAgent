import React, { useState } from 'react';
import axios from 'axios';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<{ user: string, agent: string }[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (input.trim()) {
      const newMessage = { user: input, agent: '' };

      try {
        const response = await axios.post('https://your-api-gateway-url/dev/chat', {
          chat_history: messages,
          message: input,
        });

        setMessages([...response.data]);
      } catch (error) {
        console.error(error);
      }

      setInput('');
    }
  };

  return (
    <div>
      <div>
        {messages.map((msg, index) => (
          <div key={index}>
            <p><strong>User:</strong> {msg.user}</p>
            <p><strong>Agent:</strong> {msg.agent}</p>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatInterface;